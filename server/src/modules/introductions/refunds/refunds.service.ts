import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
} from "@nestjs/common";
import { toUTC } from "utils/dayjs";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { StripeService } from "modules/stripe/stripe.service";
import { FinancesService } from "modules/finances/finances.service";
import { TrustScoreQueueService } from "modules/trust-score-queue/trust-score-queue.service";
import { convertToDollars } from "modules/payments/utils/payment-calculations.util";
import { getRefundableAmountCentsForStage } from "utils/requester-refund.util";
import {
  REFUND_STATUS,
  PAYMENT_STAGE_STATUS,
  REFUNDS_MESSAGES,
  PAYMENT_STAGE_NAMES,
  FailureStage,
  RefundInitiator,
} from "./refunds.constants";
import { RefundResult, RefundedStageInfo } from "./refunds.dto";

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly stripeService: StripeService,
    private readonly financesService: FinancesService,
    private readonly trustScoreQueueService: TrustScoreQueueService
  ) {}

  /**
   * Process refund for an unfulfilled introduction request.
   * Handles both refunding captured payments and cancelling uncaptured intents.
   */
  async processRefundForUnfulfillment(
    requestId: string,
    failureStage: FailureStage,
    initiatedBy: RefundInitiator,
    initiatedByUserId: string,
    failureReason: string
  ): Promise<RefundResult> {
    this.logger.log(
      REFUNDS_MESSAGES.LOG.PROCESSING_REFUND(requestId, failureStage)
    );

    const result: RefundResult = {
      success: true,
      refundedStages: [],
      cancelledIntents: [],
      totalRefundedAmount: 0,
    };

    // Get transaction for this request
    const transaction =
      await this.financesService.getActiveIntroductionTransactionByRequestId(
        requestId
      );

    if (!transaction) {
      throw new BadRequestException(
        REFUNDS_MESSAGES.ERROR.TRANSACTION_NOT_FOUND
      );
    }

    const [requestRow] = await this.db
      .select({
        bountyAmount: schema.introductionRequests.bountyAmount,
        totalAmount: schema.introductionRequestPricesSchema.totalAmount,
      })
      .from(schema.introductionRequests)
      .leftJoin(
        schema.introductionRequestPricesSchema,
        eq(
          schema.introductionRequests.id,
          schema.introductionRequestPricesSchema.introductionRequestId
        )
      )
      .where(eq(schema.introductionRequests.id, requestId))
      .limit(1);

    const bountyAmount = requestRow?.bountyAmount ?? "0";
    const storedTotalAmountDollars = requestRow?.totalAmount
      ? Number(requestRow.totalAmount)
      : 0;

    const transactionId = transaction.id as string;

    // Get payment stages
    const paymentStages =
      await this.financesService.getPaymentStagesByTransactionId(transactionId);

    const introStage = paymentStages.find(
      (s) => s.stageName === PAYMENT_STAGE_NAMES.INTRO_EMAIL_SENT
    );
    const meetingStage = paymentStages.find(
      (s) => s.stageName === PAYMENT_STAGE_NAMES.MEETING_BOOKED
    );

    // Process based on failure stage
    if (failureStage === "intro_sent") {
      // Refund 5% (intro_email_sent) + Cancel 95% (meeting_booked)
      if (introStage?.capturedAt && introStage.status === "captured") {
        const refundInfo = await this.refundPaymentStage(
          requestId,
          transactionId,
          introStage,
          initiatedBy,
          initiatedByUserId,
          failureReason,
          bountyAmount,
          storedTotalAmountDollars
        );
        result.refundedStages.push(refundInfo);
        result.totalRefundedAmount += refundInfo.refundAmount;
      }

      if (
        introStage &&
        !introStage.capturedAt &&
        introStage.status !== PAYMENT_STAGE_STATUS.VOIDED &&
        introStage.intentId
      ) {
        try {
          await this.cancelPaymentIntent(introStage.intentId, introStage.id);
          result.cancelledIntents.push(introStage.intentId);
        } catch (error) {
          this.logger.error(
            `Failed to cancel intro payment intent ${introStage.intentId}: ${error instanceof Error ? error.message : error}`
          );
          result.success = false;
          return result;
        }
      }

      // Cancel the 95% intent if not captured and update status to voided
      if (meetingStage && !meetingStage.capturedAt) {
        try {
          await this.cancelPaymentIntent(
            meetingStage.intentId,
            meetingStage.id
          );
          result.cancelledIntents.push(meetingStage.intentId);
        } catch (error) {
          this.logger.error(
            `Failed to cancel payment intent ${meetingStage.intentId}: ${error instanceof Error ? error.message : error}`
          );
          result.success = false;
          // Do not proceed to mark transaction as refunded
          return result;
        }
      }
    } else if (failureStage === "meeting_booked") {
      // Refund both 5% and 95%
      if (introStage?.capturedAt && introStage.status === "captured") {
        const refundInfo = await this.refundPaymentStage(
          requestId,
          transactionId,
          introStage,
          initiatedBy,
          initiatedByUserId,
          failureReason,
          bountyAmount,
          storedTotalAmountDollars
        );
        result.refundedStages.push(refundInfo);
        result.totalRefundedAmount += refundInfo.refundAmount;
      }

      if (meetingStage?.capturedAt && meetingStage.status === "captured") {
        const refundInfo = await this.refundPaymentStage(
          requestId,
          transactionId,
          meetingStage,
          initiatedBy,
          initiatedByUserId,
          failureReason,
          bountyAmount,
          storedTotalAmountDollars
        );
        result.refundedStages.push(refundInfo);
        result.totalRefundedAmount += refundInfo.refundAmount;
      }
    }

    // Only mark transaction as refunded if all refund/cancel steps succeeded
    if (result.success) {
      await this.db
        .update(schema.introductionTransactions)
        .set({
          overallStatus: REFUND_STATUS.REFUNDED,
          isActive: false,
          updatedAt: toUTC(),
        })
        .where(eq(schema.introductionTransactions.id, transactionId));
    }

    return result;
  }

  /**
   * Refund a specific payment stage and record it in the database.
   */
  private async refundPaymentStage(
    requestId: string,
    transactionId: string,
    stage: schema.PaymentStage,
    initiatedBy: RefundInitiator,
    initiatedByUserId: string,
    failureReason: string,
    bountyAmount: string,
    storedTotalAmountDollars: number
  ): Promise<RefundedStageInfo> {
    const existingRefund = await this.db.query.paymentRefunds.findFirst({
      where: eq(schema.paymentRefunds.paymentStageId, stage.id),
    });

    if (existingRefund) {
      throw new BadRequestException(
        REFUNDS_MESSAGES.ERROR.REFUND_ALREADY_PROCESSED
      );
    }

    const capturedDollars = Number(stage.chargeAmount || stage.amount);
    const capturedCents = Math.round(capturedDollars * 100);
    const refundAmountCents = getRefundableAmountCentsForStage(
      stage.stageName,
      bountyAmount,
      capturedCents,
      storedTotalAmountDollars > 0 ? storedTotalAmountDollars : undefined
    );

    if (refundAmountCents <= 0) {
      throw new BadRequestException(
        REFUNDS_MESSAGES.ERROR.PAYMENT_NOT_CAPTURED
      );
    }

    const refundAmountDollars = convertToDollars(refundAmountCents);

    const stripeRefund = await this.stripeService.createRefund(
      stage.intentId,
      refundAmountCents,
      "requested_by_customer",
      {
        introduction_request_id: requestId,
        failure_reason: failureReason,
        stage_name: stage.stageName,
      }
    );

    this.logger.log(
      REFUNDS_MESSAGES.LOG.REFUND_CREATED(stripeRefund.id, refundAmountDollars)
    );

    // Record refund in database with refund_initiated status
    await this.db.insert(schema.paymentRefunds).values({
      introductionRequestId: requestId,
      introductionTransactionId: transactionId,
      paymentStageId: stage.id,
      stripeRefundId: stripeRefund.id,
      refundAmount: refundAmountDollars.toString(),
      refundReason: failureReason,
      refundStatus: REFUND_STATUS.REFUND_INITIATED,
      initiatedBy,
      initiatedByUserId,
    });

    // Update payment_stages.status to refund_initiated
    await this.db
      .update(schema.paymentStages)
      .set({
        status: PAYMENT_STAGE_STATUS.REFUND_INITIATED,
        updatedAt: toUTC(),
      })
      .where(eq(schema.paymentStages.id, stage.id));

    return {
      stageName: stage.stageName,
      stripeRefundId: stripeRefund.id,
      refundAmount: refundAmountDollars,
      refundStatus: REFUND_STATUS.REFUND_INITIATED,
    };
  }

  /**
   * Cancel an uncaptured payment intent and update payment_stages.status to voided.
   */
  private async cancelPaymentIntent(
    intentId: string,
    stageId: string
  ): Promise<void> {
    await this.stripeService.cancelPaymentIntent(intentId);
    // Update payment_stages.status to voided
    await this.db
      .update(schema.paymentStages)
      .set({
        status: PAYMENT_STAGE_STATUS.VOIDED,
        updatedAt: toUTC(),
      })
      .where(eq(schema.paymentStages.id, stageId));
  }

  /**
   * Record a fulfillment attempt in the database.
   */
  async recordFulfillmentAttempt(
    requestId: string,
    connectorId: string,
    failureStage: FailureStage,
    failureReason: string,
    failureNotes?: string,
    db: PostgresJsDatabase<typeof schema> = this.db
  ): Promise<void> {
    await db.insert(schema.introductionFulfillmentAttempts).values({
      introductionRequestId: requestId,
      connectorId,
      failureStage,
      failureReason,
      failureNotes: failureNotes || null,
    });

    // Trigger success rate calculation for connector when request fails
    try {
      await this.trustScoreQueueService.enqueueSuccessRateTrustScoreCalculation(
        connectorId,
        "request_failed",
        requestId
      );
      this.logger.log(
        `Queued success rate calculation for connector ${connectorId} after request ${requestId} failure`
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue success rate calculation for connector ${connectorId}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get all fulfillment attempts for a request.
   */
  async getFulfillmentAttempts(
    requestId: string
  ): Promise<schema.IntroductionFulfillmentAttempt[]> {
    return this.db.query.introductionFulfillmentAttempts.findMany({
      where: eq(
        schema.introductionFulfillmentAttempts.introductionRequestId,
        requestId
      ),
    });
  }

  /**
   * Get refunds for a request.
   */
  async getRefundsForRequest(
    requestId: string
  ): Promise<schema.PaymentRefund[]> {
    return this.db.query.paymentRefunds.findMany({
      where: eq(schema.paymentRefunds.introductionRequestId, requestId),
    });
  }
}
