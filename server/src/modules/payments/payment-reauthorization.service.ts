import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { StripeService } from "modules/stripe/stripe.service";
import { FinancesService } from "modules/finances/finances.service";
import { ProfilesService } from "modules/profiles/profiles.service";
import {
  PAYMENT_STATUS,
  STRIPE_CURRENCY,
  MINIMUM_BOUNTY_AMOUNT,
} from "config/payment.config";
import {
  hasStoredRequesterFees,
  mergeRequesterFeeFields,
} from "utils/introduction-request-fees.util";
import { toUTC } from "utils/dayjs";
import { eq } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { Inject } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import Stripe from "stripe";
import {
  calculateSplitAmounts,
  convertToDollars,
  isValidBountyAmount,
} from "./utils/payment-calculations.util";
import { validatePaymentIntentCreation } from "./utils/payment-intents.util";
import {
  PAYMENTS_MESSAGES,
  PAYMENT_METADATA_TYPES,
  PAYMENT_PERCENTAGES,
} from "./payments.constants";

@Injectable()
export class PaymentReauthorizationService {
  private readonly logger = new Logger(PaymentReauthorizationService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly stripeService: StripeService,
    private readonly financesService: FinancesService,
    private readonly profilesService: ProfilesService
  ) {}

  async ensureAuthorizedForRepublish(
    requestId: string,
    requesterId: string
  ): Promise<void> {
    const activeTransaction =
      await this.financesService.getActiveIntroductionTransactionByRequestId(
        requestId
      );

    if (
      activeTransaction?.id &&
      !(await this.needsReauthorization(activeTransaction.id as string))
    ) {
      return;
    }

    await this.reauthorizeDualPaymentIntents(requestId, requesterId);
  }

  async needsReauthorizationForRequest(requestId: string): Promise<boolean> {
    const activeTransaction =
      await this.financesService.getActiveIntroductionTransactionByRequestId(
        requestId
      );

    if (!activeTransaction?.id) {
      return true;
    }

    return this.needsReauthorization(activeTransaction.id as string);
  }

  private async needsReauthorization(transactionId: string): Promise<boolean> {
    const activeStages =
      await this.financesService.getActivePaymentStagesByTransactionId(
        transactionId
      );
    const introStage = activeStages.find(
      (stage) => stage.stageName === "intro_email_sent"
    );
    const meetingStage = activeStages.find(
      (stage) => stage.stageName === "meeting_booked"
    );

    return (
      !introStage ||
      !meetingStage ||
      introStage.status !== PAYMENT_STATUS.AUTHORIZED ||
      meetingStage.status !== PAYMENT_STATUS.AUTHORIZED
    );
  }

  private async reauthorizeDualPaymentIntents(
    requestId: string,
    requesterId: string
  ): Promise<void> {
    const request = await this.db.query.introductionRequests.findFirst({
      where: eq(schema.introductionRequests.id, requestId),
      with: { pricing: true },
    });

    if (!request) {
      throw new NotFoundException(PAYMENTS_MESSAGES.ERROR.REQUEST_NOT_FOUND);
    }

    const requesterProfile =
      await this.profilesService.getProfileById(requesterId);
    if (!requesterProfile?.stripeCustomerId) {
      throw new BadRequestException(
        PAYMENTS_MESSAGES.ERROR.STRIPE_CUSTOMER_NOT_FOUND
      );
    }

    const latestTransaction =
      await this.financesService.getLatestIntroductionTransactionByRequestId(
        requestId
      );
    const paymentMethodId =
      latestTransaction?.paymentMethodId ||
      requesterProfile.stripePrimaryPaymentMethodId;

    if (!paymentMethodId) {
      throw new BadRequestException(
        "Requester has no payment method on file for re-authorization"
      );
    }

    const requestWithFees = mergeRequesterFeeFields(request, request.pricing);
    const bountyAmountDollars = Number(request.bountyAmount ?? 0);

    if (!isValidBountyAmount(bountyAmountDollars, MINIMUM_BOUNTY_AMOUNT)) {
      throw new BadRequestException(
        PAYMENTS_MESSAGES.ERROR.BOUNTY_TOO_LOW(MINIMUM_BOUNTY_AMOUNT)
      );
    }

    const payableTotalDollars = hasStoredRequesterFees(requestWithFees)
      ? parseFloat(String(requestWithFees.totalAmount))
      : bountyAmountDollars;
    const splitAmounts = calculateSplitAmounts(payableTotalDollars);

    const initialMetadata: Stripe.MetadataParam = {
      requestId,
      userId: requesterId,
      type: PAYMENT_METADATA_TYPES.INITIAL_BOUNTY,
      percentage: PAYMENT_PERCENTAGES.INITIAL,
    };

    const initialPaymentIntent =
      await this.stripeService.createAndConfirmPaymentIntent(
        splitAmounts.initialAmountCents,
        STRIPE_CURRENCY,
        requesterProfile.stripeCustomerId,
        paymentMethodId,
        initialMetadata,
        false
      );

    const initialValidation =
      validatePaymentIntentCreation(initialPaymentIntent);
    if (!initialValidation.isSuccess) {
      throw new BadRequestException(initialValidation.reason);
    }

    const remainingMetadata: Stripe.MetadataParam = {
      requestId,
      userId: requesterId,
      type: PAYMENT_METADATA_TYPES.REMAINING_BOUNTY,
      percentage: PAYMENT_PERCENTAGES.REMAINING,
    };

    const remainingPaymentIntent =
      await this.stripeService.createAndConfirmPaymentIntent(
        splitAmounts.remainingAmountCents,
        STRIPE_CURRENCY,
        requesterProfile.stripeCustomerId,
        paymentMethodId,
        remainingMetadata,
        false
      );

    const remainingValidation = validatePaymentIntentCreation(
      remainingPaymentIntent
    );
    if (!remainingValidation.isSuccess) {
      await this.stripeService.cancelPaymentIntent(initialPaymentIntent.id);
      throw new BadRequestException(remainingValidation.reason);
    }

    const createdTransaction = await this.db.transaction(async (tx) => {
      await tx
        .update(schema.introductionTransactions)
        .set({ isActive: false, updatedAt: toUTC() })
        .where(
          eq(schema.introductionTransactions.introductionRequestId, requestId)
        );

      const [transaction] = await tx
        .insert(schema.introductionTransactions)
        .values({
          introductionRequestId: requestId,
          isActive: true,
          paymentMethodId,
          overallStatus: PAYMENT_STATUS.AUTHORIZED,
          paymentAuthorizedAt: toUTC(),
          totalAuthorizedAmount: convertToDollars(
            splitAmounts.totalAmountCents
          ).toString(),
        })
        .returning();

      const transactionId = transaction.id as string;
      await tx.insert(schema.paymentStages).values([
        {
          transactionId,
          stageName: "intro_email_sent",
          stageOrder: 1,
          intentId: initialPaymentIntent.id,
          amount: convertToDollars(splitAmounts.initialAmountCents).toString(),
          status: PAYMENT_STATUS.AUTHORIZED,
          authorizedAt: toUTC(),
        },
        {
          transactionId,
          stageName: "meeting_booked",
          stageOrder: 2,
          intentId: remainingPaymentIntent.id,
          amount: convertToDollars(
            splitAmounts.remainingAmountCents
          ).toString(),
          status: PAYMENT_STATUS.AUTHORIZED,
          authorizedAt: toUTC(),
        },
      ]);

      return transaction;
    });

    try {
      await this.financesService.updateTransactionTotals(
        createdTransaction.id as string
      );
    } catch (error) {
      this.logger.error(
        `PAYMENT_REAUTHORIZATION_SERVICE :: reauthorizeDualPaymentIntents : ERROR : updating totals for transaction ${createdTransaction.id}: ${error instanceof Error ? error.message : error}`
      );
    }

    this.logger.log(
      `Re-authorized dual payment intents for request ${requestId} after unsuccessful attempt`
    );
  }
}
