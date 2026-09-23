import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger, Inject } from "@nestjs/common";
import { Job } from "bullmq";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq } from "drizzle-orm";
import { StripePayoutsService } from "modules/stripe/payouts/services";
import { V2OutboundPayment } from "modules/stripe/stripe-v2.types";
import { calculatePayoutFees } from "modules/payments/utils/payout-fees.util";
import {
  MARKETPLACE_PAYOUT_QUEUE_NAME,
  MARKETPLACE_PAYOUT_ROLE,
  MARKETPLACE_PAYOUT_MESSAGES,
} from "./marketplace-payout.constants";
import { PayoutJobData, PayoutJobResult } from "./marketplace-payout.types";
import { MarketplacePayoutService } from "./marketplace-payout.service";
import { MarketplacePayoutHelper } from "./marketplace-payout-helper";
import { centsToDollars } from "./marketplace-payout-calculation.util";

interface RolePayoutResult {
  success: boolean;
  outboundPaymentId?: string;
  error?: string;
}

interface RecipientPayoutAccount {
  recipientAccountId: string;
  payoutMethodId: string | null;
  payoutCurrency: string | null;
  country: string | null;
}

@Processor(MARKETPLACE_PAYOUT_QUEUE_NAME)
export class MarketplacePayoutQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(MarketplacePayoutQueueProcessor.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly stripePayoutsService: StripePayoutsService,
    private readonly marketplacePayoutService: MarketplacePayoutService,
    private readonly marketplacePayoutHelper: MarketplacePayoutHelper
  ) {
    super();
  }

  /**
   * Get user's Stripe Global Payouts recipient account, payout method and
   * payout currency. Both the recipient account and payout method are required
   * before an OutboundPayment can be created.
   */
  private async getUserPayoutAccount(
    userId: string
  ): Promise<RecipientPayoutAccount | null> {
    const [user] = await this.db
      .select({
        stripeRecipientAccountId: schema.users.stripeRecipientAccountId,
        stripePayoutMethodId: schema.users.stripePayoutMethodId,
        stripeRecipientOnboardingComplete:
          schema.users.stripeRecipientOnboardingComplete,
        payoutCurrency: schema.users.payoutCurrency,
        country: schema.users.country,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (
      !user?.stripeRecipientAccountId ||
      !user?.stripeRecipientOnboardingComplete
    ) {
      return null;
    }

    return {
      recipientAccountId: user.stripeRecipientAccountId,
      payoutMethodId: user.stripePayoutMethodId,
      payoutCurrency: user.payoutCurrency,
      country: user.country,
    };
  }

  async process(job: Job<PayoutJobData>): Promise<PayoutJobResult> {
    const { introductionRequestId } = job.data;

    this.logger.log(
      `Processing marketplace payout job ${job.id} for request ${introductionRequestId}`
    );

    try {
      // Get marketplace deal info
      const dealInfo =
        await this.marketplacePayoutService.getMarketplaceDealInfo(
          introductionRequestId
        );

      if (!dealInfo) {
        return {
          success: false,
          introductionRequestId,
          error: MARKETPLACE_PAYOUT_MESSAGES.ERROR.NOT_MARKETPLACE_DEAL,
        };
      }

      // Validate payment has been captured
      const paymentValid =
        await this.marketplacePayoutService.validatePaymentsCaptured(
          introductionRequestId
        );
      if (!paymentValid) {
        return {
          success: false,
          introductionRequestId,
          error: MARKETPLACE_PAYOUT_MESSAGES.ERROR.PAYMENT_NOT_CAPTURED,
        };
      }

      // Calculate payout split (40/40/20)
      const split = this.marketplacePayoutService.calculatePayoutSplit(
        dealInfo.bountyAmount
      );

      this.logger.log(
        `Marketplace payout split for ${introductionRequestId}: ` +
          `claimer=${split.claimerCents}, sharer=${split.sharerCents}, platform=${split.platformCents}`
      );

      // Get existing payout records
      const existingRecords =
        await this.marketplacePayoutHelper.getPayoutRecordsByRequestId(
          introductionRequestId
        );

      const claimerRecord = existingRecords.find(
        (r) => r.marketplaceRole === MARKETPLACE_PAYOUT_ROLE.CLAIMER
      );
      const sharerRecord = existingRecords.find(
        (r) => r.marketplaceRole === MARKETPLACE_PAYOUT_ROLE.SHARER
      );

      // Process claimer payout
      const claimerResult = await this.processRolePayout(
        dealInfo.claimerId,
        MARKETPLACE_PAYOUT_ROLE.CLAIMER,
        split.claimerCents,
        introductionRequestId,
        dealInfo,
        claimerRecord
      );

      // Process sharer payout (even if claimer failed)
      const sharerResult = await this.processRolePayout(
        dealInfo.sharerId,
        MARKETPLACE_PAYOUT_ROLE.SHARER,
        split.sharerCents,
        introductionRequestId,
        dealInfo,
        sharerRecord
      );

      // Update claim with payout amounts
      await this.marketplacePayoutService.updateClaimPayoutAmounts(
        introductionRequestId,
        centsToDollars(split.claimerCents),
        centsToDollars(split.sharerCents)
      );

      // Determine overall success (at least one succeeded)
      const overallSuccess = claimerResult.success || sharerResult.success;

      return {
        success: overallSuccess,
        introductionRequestId,
        claimerPayoutId: claimerResult.outboundPaymentId,
        sharerPayoutId: sharerResult.outboundPaymentId,
        claimerAmount: split.claimerCents,
        sharerAmount: split.sharerCents,
        error: !overallSuccess
          ? `Claimer: ${claimerResult.error || "N/A"}, Sharer: ${sharerResult.error || "N/A"}`
          : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Marketplace payout job ${job.id} failed: ${errorMessage}`
      );

      return {
        success: false,
        introductionRequestId,
        error: errorMessage,
      };
    }
  }

  /**
   * Process payout for a specific role (claimer or sharer)
   * Handles individual success/failure tracking
   */
  private async processRolePayout(
    userId: string,
    role: string,
    amountCents: number,
    introductionRequestId: string,
    dealInfo: { claimerId: string; sharerId: string },
    existingRecord?: schema.PayoutHistory
  ): Promise<RolePayoutResult> {
    // Check if already completed
    if (existingRecord?.status === "completed") {
      this.logger.log(
        `${role} payout already completed for request ${introductionRequestId}`
      );
      return {
        success: true,
        outboundPaymentId: existingRecord.stripeOutboundPaymentId || undefined,
      };
    }

    // Mark as processing if record exists
    if (existingRecord) {
      await this.marketplacePayoutHelper.markPayoutRecordProcessing(
        existingRecord.id
      );
    }

    // Get the user's Global Payouts recipient account + payout method (bank added)
    const payoutAccount = await this.getUserPayoutAccount(userId);

    if (!payoutAccount) {
      // Defer (not fail) so the v2 webhook auto-releases it once the recipient
      // connects their bank — consistent with the connector/recruitment rails.
      if (existingRecord) {
        await this.marketplacePayoutHelper.markPayoutRecordDeferred(
          existingRecord.id
        );
      }

      this.logger.warn(
        `${role} has no payout bank account, deferring payout: ${userId}`
      );
      return { success: false, error: "onboarding_pending" };
    }

    if (amountCents <= 0) {
      this.logger.warn(`${role} payout amount is zero or negative`);
      return { success: false, error: "Invalid payout amount" };
    }

    // Deduct Stripe payout fees from this role's amount (per country).
    const payoutFees = calculatePayoutFees(amountCents, payoutAccount.country);
    if (payoutFees.feesExceedPayout) {
      this.logger.error(
        `${role} payout fees (${payoutFees.totalFeeCents}c) exceed payout (${amountCents}c) for request ${introductionRequestId} — manual review required`
      );
      if (existingRecord) {
        await this.marketplacePayoutHelper.updatePayoutRecordStatus(
          existingRecord.id,
          "failed",
          undefined,
          payoutAccount.recipientAccountId,
          "fees_exceed_payout — manual review required",
          payoutAccount.payoutCurrency || undefined
        );
      }
      return { success: false, error: "fees_exceed_payout" };
    }

    try {
      // Global Payouts OutboundPayment (platform USD balance -> recipient bank).
      // ONE call replaces the old transfer + best-effort payout: Stripe debits
      // the platform USD balance and converts to the recipient's local currency.
      const outbound: V2OutboundPayment =
        await this.stripePayoutsService.createOutboundPayment({
          amountCents: payoutFees.netCents,
          recipientAccountId: payoutAccount.recipientAccountId,
          payoutMethodId: payoutAccount.payoutMethodId,
          idempotencyKey: `marketplace_payout_${introductionRequestId}_${role}`,
          description: `Referral payout for introduction ${introductionRequestId}`,
          metadata: {
            type: "marketplace_payout",
            role,
            introduction_request_id: introductionRequestId,
            claimer_id: dealInfo.claimerId,
            sharer_id: dealInfo.sharerId,
          },
        });

      this.logger.log(
        `${role} OutboundPayment created: ${outbound.id} for ${payoutFees.netCents} cents`
      );

      // Update existing record to completed
      if (existingRecord) {
        await this.marketplacePayoutHelper.updatePayoutRecordStatus(
          existingRecord.id,
          "completed",
          outbound.id,
          payoutAccount.recipientAccountId,
          undefined,
          payoutAccount.payoutCurrency || undefined,
          {
            recipientReceivedAmount: centsToDollars(
              payoutFees.netCents
            ).toFixed(2),
            payoutFeeBreakdown: payoutFees,
          }
        );
      }

      return { success: true, outboundPaymentId: outbound.id };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      this.logger.error(
        `Failed to create ${role} OutboundPayment: ${errorMessage}`
      );

      // Update record to failed if exists
      if (existingRecord) {
        await this.marketplacePayoutHelper.updatePayoutRecordStatus(
          existingRecord.id,
          "failed",
          undefined,
          payoutAccount.recipientAccountId,
          errorMessage,
          payoutAccount.payoutCurrency || undefined
        );
      }

      return { success: false, error: errorMessage };
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<PayoutJobData>) {
    this.logger.log(`Marketplace payout job ${job.id} completed`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<PayoutJobData>, error: Error) {
    this.logger.error(
      `Marketplace payout job ${job.id} failed: ${error.message}`
    );
  }
}
