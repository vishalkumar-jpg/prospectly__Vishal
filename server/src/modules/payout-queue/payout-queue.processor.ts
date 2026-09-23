import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger, Inject } from "@nestjs/common";
import { Job } from "bullmq";
import { FinancesService } from "modules/finances/finances.service";
import { StripePayoutsService } from "modules/stripe/payouts/services";
import { ProfilesService } from "modules/profiles/profiles.service";
import { CreditUsageHelper } from "modules/credits/helpers/credit-usage.helper";
import {
  calculatePayoutSplit,
  convertToCents,
  convertToDollars,
  formatCentsForDisplay,
} from "modules/payments/utils/payment-calculations.util";
import { EmailsService } from "modules/emails/emails.service";
import { PAYOUT_TRIGGER } from "config/payment.config";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { AnyType } from "types/common";
import { V2OutboundPayment } from "modules/stripe/stripe-v2.types";
import { calculatePayoutFees } from "modules/payments/utils/payout-fees.util";
import {
  TrustScorePayoutJobData,
  FeedbackPayoutJobData,
  PayoutJobResult,
} from "./payout-queue.types";
import {
  PAYOUT_QUEUE_NAME,
  PAYOUT_JOB_TYPES,
  PROCESSING_STATUS,
} from "./payout-queue.constants";

@Processor(PAYOUT_QUEUE_NAME)
export class PayoutQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(PayoutQueueProcessor.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly stripePayoutsService: StripePayoutsService,
    private readonly financesService: FinancesService,
    private readonly profilesService: ProfilesService,
    private readonly emailsService: EmailsService,
    private readonly creditUsageHelper: CreditUsageHelper
  ) {
    super();
  }

  async process(
    job: Job<TrustScorePayoutJobData | FeedbackPayoutJobData>
  ): Promise<PayoutJobResult> {
    const { name, data, id } = job;
    this.logger.log(
      `Processing payout job ${id} of type ${name} for request ${data.requestId}`
    );

    try {
      await this.updateProcessingStatus(
        data.requestId,
        PROCESSING_STATUS.PROCESSING,
        id
      );

      let result: PayoutJobResult;

      if (name === PAYOUT_JOB_TYPES.TRUST_SCORE_PAYOUT) {
        result = await this.processTrustScorePayout(
          data as TrustScorePayoutJobData
        );
      } else if (name === PAYOUT_JOB_TYPES.FEEDBACK_PAYOUT) {
        result = await this.processFeedbackPayout(
          data as FeedbackPayoutJobData
        );
      } else {
        throw new Error(`Unknown job type: ${name}`);
      }

      if (result.success) {
        await this.updateProcessingStatus(
          data.requestId,
          PROCESSING_STATUS.COMPLETED,
          id
        );
      } else {
        await this.updateProcessingStatus(
          data.requestId,
          PROCESSING_STATUS.FAILED,
          id,
          result.error
        );
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Payout job ${id} failed: ${errorMessage}`);

      await this.updateProcessingStatus(
        data.requestId,
        PROCESSING_STATUS.FAILED,
        id,
        errorMessage
      );

      throw error;
    }
  }

  private async processTrustScorePayout(
    data: TrustScorePayoutJobData
  ): Promise<PayoutJobResult> {
    const { requestId, connectorId, bountyAmount } = data;

    this.logger.log(`Executing trust-score payout for request ${requestId}`);

    // Fetch requester details for email notifications
    let requesterName = "Requester";
    let connectorEmail = "";

    try {
      const requestDetails = await this.getIntroductionRequest(requestId);
      if (requestDetails?.requesterId) {
        const requester = await this.profilesService.getProfileById(
          requestDetails.requesterId
        );
        requesterName = requester?.fullName || "Requester";
      }

      const connectorProfile =
        await this.profilesService.getProfileById(connectorId);
      connectorEmail = connectorProfile?.email || "";
    } catch (e) {
      this.logger.warn(`Error preparing email data: ${e}`);
    }

    // Pre-payout: Check idempotency with row-level lock
    let payoutRecord: schema.PayoutHistory | null = null;
    try {
      await this.db.transaction(async (tx) => {
        const [payout] = await tx
          .select()
          .from(schema.payoutHistory)
          .where(eq(schema.payoutHistory.introductionRequestId, requestId))
          .for("update"); // Row-level lock to prevent concurrent processing

        if (!payout) {
          throw new Error(`Payout history not found for request ${requestId}`);
        }

        // Check if already processed
        if (payout.payoutReleased || payout.stripeOutboundPaymentId) {
          payoutRecord = payout;
          return; // Exit transaction early - already processed
        }

        // Mark as processing atomically
        await tx
          .update(schema.payoutHistory)
          .set({
            processingStatus: PROCESSING_STATUS.PROCESSING,
            processingStartedAt: toUTC(),
            updatedAt: toUTC(),
          })
          .where(eq(schema.payoutHistory.introductionRequestId, requestId));

        payoutRecord = payout;
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Pre-payout transaction failed for request ${requestId}: ${errorMessage}`
      );
      return {
        success: false,
        requestId,
        connectorAmountCents: 0,
        platformAmountCents: 0,
        error: `Pre-payout check failed: ${errorMessage}`,
      };
    }

    // If already processed, return early
    if (payoutRecord?.payoutReleased || payoutRecord?.stripeOutboundPaymentId) {
      this.logger.log(`Payout already released for request ${requestId}`);
      return {
        success: true,
        requestId,
        connectorAmountCents: convertToCents(payoutRecord.netAmount || 0),
        platformAmountCents: convertToCents(
          payoutRecord.platformCommissionAmount || 0
        ),
        outboundPaymentId: payoutRecord.stripeOutboundPaymentId || undefined,
      };
    }

    // Validate connector has a payout-ready recipient account (bank added)
    const connector = await this.profilesService.getProfileById(connectorId);
    if (
      !connector?.stripeRecipientAccountId ||
      !connector?.stripeRecipientOnboardingComplete
    ) {
      // If this was an ONBOARDING_PENDING payout, keep it pending
      if (
        payoutRecord?.processingStatus === PROCESSING_STATUS.ONBOARDING_PENDING
      ) {
        await this.financesService.updatePayoutHistoryByRequestId(requestId, {
          processingStatus: PROCESSING_STATUS.ONBOARDING_PENDING,
          errorMessage: "Payout bank account not connected",
        });
      }
      return {
        success: false,
        requestId,
        connectorAmountCents: 0,
        platformAmountCents: 0,
        error: "Connector missing payout bank account",
      };
    }

    const totalCapturedCents = convertToCents(bountyAmount);
    const payoutSplit = calculatePayoutSplit(totalCapturedCents);

    // Calculate credit application for the connector
    const creditApplication =
      await this.creditUsageHelper.calculateCreditApplicationForUser(
        connectorId,
        payoutSplit.platformAmountCents
      );

    // Calculate adjusted amounts with credits
    const effectiveConnectorAmountCents =
      payoutSplit.connectorAmountCents + creditApplication.connectorBonusCents;
    const effectivePlatformAmountCents =
      creditApplication.effectiveCommissionCents;

    if (creditApplication.creditsToApply > 0) {
      this.logger.log(
        `Applying ${creditApplication.creditsToApply} credits for request ${requestId}: ` +
          `connector gets ${effectiveConnectorAmountCents} cents (was ${payoutSplit.connectorAmountCents}), ` +
          `platform gets ${effectivePlatformAmountCents} cents (was ${payoutSplit.platformAmountCents})`
      );
    }

    // Global Payouts OutboundPayment (external, cannot be in transaction).
    // Funds are debited from the platform USD balance and converted to the
    // connector's local currency by Stripe.
    // Deduct Stripe payout fees from the connector's amount (per country).
    const payoutFees = calculatePayoutFees(
      effectiveConnectorAmountCents,
      connector.country
    );
    if (payoutFees.feesExceedPayout) {
      this.logger.error(
        `Payout fees (${payoutFees.totalFeeCents}c) exceed payout (${effectiveConnectorAmountCents}c) for request ${requestId} — manual review required`
      );
      return {
        success: false,
        requestId,
        connectorAmountCents: 0,
        platformAmountCents: 0,
        error: "fees_exceed_payout",
      };
    }

    let outbound: V2OutboundPayment;
    try {
      outbound = await this.stripePayoutsService.createOutboundPayment({
        amountCents: payoutFees.netCents,
        recipientAccountId: connector.stripeRecipientAccountId,
        payoutMethodId: connector.stripePayoutMethodId ?? undefined,
        idempotencyKey: `intro_payout_${requestId}`,
        description: `Referral payout for introduction ${requestId}`,
        metadata: {
          introduction_request_id: requestId,
          connector_id: connectorId,
          payout_triggered_by: PAYOUT_TRIGGER.TRUST_SCORE,
          credits_applied: creditApplication.creditsToApply.toString(),
        },
      });

      this.logger.log(
        `OutboundPayment ${outbound.id} created for request ${requestId}`
      );
    } catch (payoutError) {
      const errorMessage =
        payoutError instanceof Error ? payoutError.message : "Unknown error";
      this.logger.error(
        `OutboundPayment failed for request ${requestId}: ${errorMessage}`
      );
      return {
        success: false,
        requestId,
        connectorAmountCents: 0,
        platformAmountCents: 0,
        error: `OutboundPayment failed: ${errorMessage}`,
      };
    }

    // Post-payout: Update with OutboundPayment ID atomically
    let payoutHistoryId: string | undefined;
    try {
      await this.db.transaction(async (tx) => {
        const [payout] = await tx
          .select()
          .from(schema.payoutHistory)
          .where(eq(schema.payoutHistory.introductionRequestId, requestId))
          .for("update"); // Row-level lock

        if (!payout) {
          throw new Error(
            `Payout history not found for request ${requestId} during post-payout update`
          );
        }

        payoutHistoryId = payout.id;

        // Double-check idempotency (in case another process updated it)
        if (payout.payoutReleased || payout.stripeOutboundPaymentId) {
          this.logger.warn(
            `Payout already released for ${requestId} - skipping update. Existing payment: ${payout.stripeOutboundPaymentId}`
          );
          return;
        }

        // Update atomically
        const now = toUTC();
        await tx
          .update(schema.payoutHistory)
          .set({
            stripeOutboundPaymentId: outbound.id,
            recipientAccountId: connector.stripeRecipientAccountId,
            destinationCurrency: connector.payoutCurrency,
            netAmount: convertToDollars(
              effectiveConnectorAmountCents
            ).toString(),
            recipientReceivedAmount: convertToDollars(
              payoutFees.netCents
            ).toString(),
            payoutFeeBreakdown: payoutFees,
            platformCommissionAmount: convertToDollars(
              effectivePlatformAmountCents
            ).toString(),
            creditsApplied: creditApplication.creditsToApply.toFixed(2),
            creditsRemainingAfter: creditApplication.newBalance.toFixed(2),
            commissionAfterCredits: convertToDollars(
              effectivePlatformAmountCents
            ).toString(),
            payoutReleased: true,
            payoutReleasedAt: now,
            payoutTriggeredBy: PAYOUT_TRIGGER.TRUST_SCORE,
            status: "completed",
            completedAt: now,
            processingStatus: PROCESSING_STATUS.COMPLETED,
            processingCompletedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.payoutHistory.introductionRequestId, requestId));

        // Deduct credits if any were applied
        if (creditApplication.creditsToApply > 0 && payoutHistoryId) {
          await this.creditUsageHelper.applyCreditsToPayout(
            tx,
            connectorId,
            payoutHistoryId,
            requestId,
            creditApplication.creditsToApply,
            bountyAmount,
            convertToDollars(payoutSplit.platformAmountCents),
            convertToDollars(effectivePlatformAmountCents),
            convertToDollars(effectiveConnectorAmountCents)
          );
        }
      });

      this.logger.log(
        `Database updated for payout completion: request ${requestId}, payment ${outbound.id}`
      );
      if (connectorEmail) {
        await this.emailsService
          .sendPayoutCompleteEmail(
            connectorEmail,
            formatCentsForDisplay(effectiveConnectorAmountCents),
            requesterName
          )
          .catch((e) =>
            this.logger.error(`Failed to send payout complete email: ${e}`)
          );
      }
    } catch (dbError) {
      // CRITICAL: OutboundPayment succeeded but DB update failed
      // Log for manual reconciliation
      const errorMessage =
        dbError instanceof Error ? dbError.message : "Unknown error";
      this.logger.error(
        `CRITICAL: OutboundPayment ${outbound.id} succeeded for request ${requestId}, but database update failed: ${errorMessage}. Manual reconciliation required.`
      );

      // Attempt to update with error status (non-blocking)
      try {
        await this.financesService.updatePayoutHistoryByRequestId(requestId, {
          processingStatus: PROCESSING_STATUS.FAILED,
          errorMessage: `DB update failed after OutboundPayment. Payment ID: ${outbound.id}. Error: ${errorMessage}`,
          lastRetryAt: toUTC(),
        });
      } catch (updateError) {
        this.logger.error(
          `Failed to update error status for request ${requestId}: ${updateError}`
        );
      }

      return {
        success: false,
        requestId,
        connectorAmountCents: effectiveConnectorAmountCents,
        platformAmountCents: effectivePlatformAmountCents,
        outboundPaymentId: outbound.id,
        error: `Database update failed after OutboundPayment. Payment ID: ${outbound.id}. Manual reconciliation required.`,
      };
    }

    return {
      success: true,
      requestId,
      outboundPaymentId: outbound.id,
      connectorAmountCents: effectiveConnectorAmountCents,
      platformAmountCents: effectivePlatformAmountCents,
    };
  }

  private async processFeedbackPayout(
    data: FeedbackPayoutJobData
  ): Promise<PayoutJobResult> {
    const { requestId, connectorId, bountyAmount } = data;

    this.logger.log(
      `Executing feedback-triggered payout for request ${requestId}`
    );

    // Fetch requester details for email notifications
    let requesterName = "Requester";
    let connectorEmail = "";

    try {
      const requestDetails = await this.getIntroductionRequest(requestId);
      if (requestDetails?.requesterId) {
        const requester = await this.profilesService.getProfileById(
          requestDetails.requesterId
        );
        requesterName = requester?.fullName || "Requester";
      }

      const connectorProfile =
        await this.profilesService.getProfileById(connectorId);
      connectorEmail = connectorProfile?.email || "";
    } catch (e) {
      this.logger.warn(`Error preparing email data: ${e}`);
    }

    // Pre-payout: Check idempotency with row-level lock
    let payoutRecord: schema.PayoutHistory | null = null;
    try {
      await this.db.transaction(async (tx) => {
        const [payout] = await tx
          .select()
          .from(schema.payoutHistory)
          .where(eq(schema.payoutHistory.introductionRequestId, requestId))
          .for("update"); // Row-level lock to prevent concurrent processing

        if (!payout) {
          throw new Error(`Payout history not found for request ${requestId}`);
        }

        // Check if already processed
        if (payout.payoutReleased || payout.stripeOutboundPaymentId) {
          payoutRecord = payout;
          return; // Exit transaction early - already processed
        }

        // Validate payout eligibility
        if (!payout.payoutEligible) {
          throw new Error("Request not eligible for payout");
        }

        // Mark as processing atomically
        await tx
          .update(schema.payoutHistory)
          .set({
            processingStatus: PROCESSING_STATUS.PROCESSING,
            processingStartedAt: toUTC(),
            updatedAt: toUTC(),
          })
          .where(eq(schema.payoutHistory.introductionRequestId, requestId));

        payoutRecord = payout;
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Pre-payout transaction failed for request ${requestId}: ${errorMessage}`
      );
      return {
        success: false,
        requestId,
        connectorAmountCents: 0,
        platformAmountCents: 0,
        error: `Pre-payout check failed: ${errorMessage}`,
      };
    }

    // If already processed, return early
    if (payoutRecord?.payoutReleased || payoutRecord?.stripeOutboundPaymentId) {
      this.logger.log(`Payout already released for request ${requestId}`);
      return {
        success: true,
        requestId,
        connectorAmountCents: convertToCents(payoutRecord.netAmount || 0),
        platformAmountCents: convertToCents(
          payoutRecord.platformCommissionAmount || 0
        ),
        outboundPaymentId: payoutRecord.stripeOutboundPaymentId || undefined,
      };
    }

    // Validate connector feedback submitted (check request, not payout history)
    const request = await this.getIntroductionRequest(requestId);
    if (!request) {
      return {
        success: false,
        requestId,
        connectorAmountCents: 0,
        platformAmountCents: 0,
        error: "Request not found",
      };
    }

    if (!request.connectorFeedbackSubmitted) {
      return {
        success: false,
        requestId,
        connectorAmountCents: 0,
        platformAmountCents: 0,
        error: "Connector feedback not submitted",
      };
    }

    // Validate connector has a payout-ready recipient account (bank added)
    const connector = await this.profilesService.getProfileById(connectorId);
    if (
      !connector?.stripeRecipientAccountId ||
      !connector?.stripeRecipientOnboardingComplete
    ) {
      // If this was an ONBOARDING_PENDING payout, keep it pending
      if (
        payoutRecord?.processingStatus === PROCESSING_STATUS.ONBOARDING_PENDING
      ) {
        await this.financesService.updatePayoutHistoryByRequestId(requestId, {
          processingStatus: PROCESSING_STATUS.ONBOARDING_PENDING,
          errorMessage: "Payout bank account not connected",
        });
      }
      return {
        success: false,
        requestId,
        connectorAmountCents: 0,
        platformAmountCents: 0,
        error: "Connector missing payout bank account",
      };
    }

    const totalCapturedCents = convertToCents(bountyAmount);
    const payoutSplit = calculatePayoutSplit(totalCapturedCents);

    // Calculate credit application for the connector
    const creditApplication =
      await this.creditUsageHelper.calculateCreditApplicationForUser(
        connectorId,
        payoutSplit.platformAmountCents
      );

    // Calculate adjusted amounts with credits
    const effectiveConnectorAmountCents =
      payoutSplit.connectorAmountCents + creditApplication.connectorBonusCents;
    const effectivePlatformAmountCents =
      creditApplication.effectiveCommissionCents;

    if (creditApplication.creditsToApply > 0) {
      this.logger.log(
        `Applying ${creditApplication.creditsToApply} credits for feedback payout request ${requestId}: ` +
          `connector gets ${effectiveConnectorAmountCents} cents (was ${payoutSplit.connectorAmountCents}), ` +
          `platform gets ${effectivePlatformAmountCents} cents (was ${payoutSplit.platformAmountCents})`
      );
    }

    // Global Payouts OutboundPayment (external, cannot be in transaction)
    // Deduct Stripe payout fees from the connector's amount (per country).
    const payoutFees = calculatePayoutFees(
      effectiveConnectorAmountCents,
      connector.country
    );
    if (payoutFees.feesExceedPayout) {
      this.logger.error(
        `Payout fees (${payoutFees.totalFeeCents}c) exceed payout (${effectiveConnectorAmountCents}c) for request ${requestId} — manual review required`
      );
      return {
        success: false,
        requestId,
        connectorAmountCents: 0,
        platformAmountCents: 0,
        error: "fees_exceed_payout",
      };
    }

    let outbound: V2OutboundPayment;
    try {
      outbound = await this.stripePayoutsService.createOutboundPayment({
        amountCents: payoutFees.netCents,
        recipientAccountId: connector.stripeRecipientAccountId,
        payoutMethodId: connector.stripePayoutMethodId ?? undefined,
        idempotencyKey: `intro_payout_${requestId}`,
        description: `Referral payout for introduction ${requestId}`,
        metadata: {
          introduction_request_id: requestId,
          connector_id: connectorId,
          payout_triggered_by: PAYOUT_TRIGGER.PEER_FEEDBACK,
          credits_applied: creditApplication.creditsToApply.toString(),
        },
      });

      this.logger.log(
        `OutboundPayment ${outbound.id} created for feedback payout request ${requestId}`
      );
    } catch (payoutError) {
      const errorMessage =
        payoutError instanceof Error ? payoutError.message : "Unknown error";
      this.logger.error(
        `OutboundPayment failed for request ${requestId}: ${errorMessage}`
      );
      return {
        success: false,
        requestId,
        connectorAmountCents: 0,
        platformAmountCents: 0,
        error: `OutboundPayment failed: ${errorMessage}`,
      };
    }

    // Post-payout: Update with OutboundPayment ID atomically
    let payoutHistoryId: string | undefined;
    try {
      await this.db.transaction(async (tx) => {
        const [payout] = await tx
          .select()
          .from(schema.payoutHistory)
          .where(eq(schema.payoutHistory.introductionRequestId, requestId))
          .for("update"); // Row-level lock

        if (!payout) {
          throw new Error(
            `Payout history not found for request ${requestId} during post-payout update`
          );
        }

        payoutHistoryId = payout.id;

        // Double-check idempotency (in case another process updated it)
        if (payout.payoutReleased || payout.stripeOutboundPaymentId) {
          this.logger.warn(
            `Payout already released for ${requestId} - skipping update. Existing payment: ${payout.stripeOutboundPaymentId}`
          );
          return;
        }

        // Update atomically
        const now = toUTC();
        await tx
          .update(schema.payoutHistory)
          .set({
            stripeOutboundPaymentId: outbound.id,
            recipientAccountId: connector.stripeRecipientAccountId,
            destinationCurrency: connector.payoutCurrency,
            netAmount: convertToDollars(
              effectiveConnectorAmountCents
            ).toString(),
            recipientReceivedAmount: convertToDollars(
              payoutFees.netCents
            ).toString(),
            payoutFeeBreakdown: payoutFees,
            platformCommissionAmount: convertToDollars(
              effectivePlatformAmountCents
            ).toString(),
            creditsApplied: creditApplication.creditsToApply.toFixed(2),
            creditsRemainingAfter: creditApplication.newBalance.toFixed(2),
            commissionAfterCredits: convertToDollars(
              effectivePlatformAmountCents
            ).toString(),
            payoutReleased: true,
            payoutReleasedAt: now,
            payoutTriggeredBy: PAYOUT_TRIGGER.PEER_FEEDBACK,
            status: "completed",
            completedAt: now,
            processingStatus: PROCESSING_STATUS.COMPLETED,
            processingCompletedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.payoutHistory.introductionRequestId, requestId));

        // Deduct credits if any were applied
        if (creditApplication.creditsToApply > 0 && payoutHistoryId) {
          await this.creditUsageHelper.applyCreditsToPayout(
            tx,
            connectorId,
            payoutHistoryId,
            requestId,
            creditApplication.creditsToApply,
            bountyAmount,
            convertToDollars(payoutSplit.platformAmountCents),
            convertToDollars(effectivePlatformAmountCents),
            convertToDollars(effectiveConnectorAmountCents)
          );
        }
      });

      this.logger.log(
        `Database updated for payout completion: request ${requestId}, payment ${outbound.id}`
      );
      if (connectorEmail) {
        await this.emailsService
          .sendPayoutCompleteEmail(
            connectorEmail,
            formatCentsForDisplay(effectiveConnectorAmountCents),
            requesterName
          )
          .catch((e) =>
            this.logger.error(`Failed to send payout complete email: ${e}`)
          );
      }
    } catch (dbError) {
      // CRITICAL: OutboundPayment succeeded but DB update failed
      // Log for manual reconciliation
      const errorMessage =
        dbError instanceof Error ? dbError.message : "Unknown error";
      this.logger.error(
        `CRITICAL: OutboundPayment ${outbound.id} succeeded for request ${requestId}, but database update failed: ${errorMessage}. Manual reconciliation required.`
      );

      // Attempt to update with error status (non-blocking)
      try {
        await this.financesService.updatePayoutHistoryByRequestId(requestId, {
          processingStatus: PROCESSING_STATUS.FAILED,
          errorMessage: `DB update failed after OutboundPayment. Payment ID: ${outbound.id}. Error: ${errorMessage}`,
          lastRetryAt: toUTC(),
        });
      } catch (updateError) {
        this.logger.error(
          `Failed to update error status for request ${requestId}: ${updateError}`
        );
      }

      return {
        success: false,
        requestId,
        connectorAmountCents: effectiveConnectorAmountCents,
        platformAmountCents: effectivePlatformAmountCents,
        outboundPaymentId: outbound.id,
        error: `Database update failed after OutboundPayment. Payment ID: ${outbound.id}. Manual reconciliation required.`,
      };
    }

    return {
      success: true,
      requestId,
      outboundPaymentId: outbound.id,
      connectorAmountCents: effectiveConnectorAmountCents,
      platformAmountCents: effectivePlatformAmountCents,
    };
  }

  private async getIntroductionRequest(requestId: string) {
    const [request] = await this.db
      .select({
        id: schema.introductionRequests.id,
        payoutEligible: schema.payoutHistory.payoutEligible, // From joined payout history
        payoutReleased: schema.payoutHistory.payoutReleased,
        connectorPayoutAmount: schema.payoutHistory.netAmount,
        platformCommissionAmount: schema.payoutHistory.platformCommissionAmount,
        stripeOutboundPaymentId: schema.payoutHistory.stripeOutboundPaymentId,
        connectorFeedbackSubmitted:
          schema.introductionRequests.connectorFeedbackSubmitted,
        status: schema.introductionRequests.status,
        requesterId: schema.introductionRequests.requesterId,
      })
      .from(schema.introductionRequests)
      .leftJoin(
        schema.payoutHistory,
        eq(
          schema.introductionRequests.id,
          schema.payoutHistory.introductionRequestId
        )
      )
      .where(eq(schema.introductionRequests.id, requestId))
      .limit(1);

    if (!request) return null;
    return request as AnyType;
  }

  private async updateProcessingStatus(
    requestId: string,
    status: string,
    jobId?: string,
    errorMessage?: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      processingStatus: status,
    };

    if (jobId) {
      updateData.jobId = jobId;
    }

    if (status === PROCESSING_STATUS.PROCESSING) {
      updateData.processingStartedAt = toUTC();
    } else if (status === PROCESSING_STATUS.COMPLETED) {
      updateData.processingCompletedAt = toUTC();
    } else if (status === PROCESSING_STATUS.FAILED) {
      updateData.errorMessage = errorMessage;
      updateData.lastRetryAt = toUTC();
    }

    await this.financesService.updatePayoutHistoryByRequestId(
      requestId,
      updateData
    );
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<PayoutJobResult>) {
    this.logger.log(
      `Payout job ${job.id} completed successfully for request ${job.data.requestId}`
    );
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Payout job ${job.id} failed: ${error.message}`,
      error.stack
    );
  }

  @OnWorkerEvent("stalled")
  onStalled(jobId: string) {
    this.logger.warn(`Payout job ${jobId} stalled - will be retried`);
  }
}
