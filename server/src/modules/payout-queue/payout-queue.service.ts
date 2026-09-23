import { Injectable, Logger, Inject } from "@nestjs/common";
import { toUTC } from "utils/dayjs";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ProfilesService } from "modules/profiles/profiles.service";
import { FinancesService } from "modules/finances/finances.service";
import { StripePayoutsService } from "modules/stripe/payouts/services";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq } from "drizzle-orm";
import {
  TrustScorePayoutJobData,
  FeedbackPayoutJobData,
} from "./payout-queue.types";
import {
  PAYOUT_QUEUE_NAME,
  PAYOUT_JOB_TYPES,
  PROCESSING_STATUS,
  PAYOUT_QUEUE_CONFIG,
} from "./payout-queue.constants";

interface JobStatus {
  found: boolean;
  id?: string;
  name?: string;
  state?: string;
  attemptsMade?: number;
  processedOn?: number;
  finishedOn?: number;
  returnvalue?: unknown;
  failedReason?: string;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

@Injectable()
export class PayoutQueueService {
  private readonly logger = new Logger(PayoutQueueService.name);

  constructor(
    @InjectQueue(PAYOUT_QUEUE_NAME) private readonly payoutQueue: Queue,
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly profilesService: ProfilesService,
    private readonly financesService: FinancesService,
    private readonly stripePayoutsService: StripePayoutsService
  ) {}

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const job = await this.payoutQueue.getJob(jobId);
    if (!job) {
      return { found: false };
    }

    const state = await job.getState();
    return {
      found: true,
      id: job.id,
      name: job.name,
      state,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  async getQueueStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.payoutQueue.getWaitingCount(),
      this.payoutQueue.getActiveCount(),
      this.payoutQueue.getCompletedCount(),
      this.payoutQueue.getFailedCount(),
      this.payoutQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Processes all deferred payouts for a connector when their Stripe account becomes ready.
   * Fetches all ONBOARDING_PENDING payouts, validates eligibility, and queues them for processing.
   */
  async processDeferredPayoutsForConnector(connectorId: string): Promise<{
    processed: number;
    skipped: number;
    failed: number;
    errors: string[];
  }> {
    this.logger.log(`Processing deferred payouts for connector ${connectorId}`);

    // Validate Stripe account is ready
    const accountValidation =
      await this.validateStripeAccountReady(connectorId);
    if (!accountValidation.isReady) {
      this.logger.warn(
        `Cannot process deferred payouts for connector ${connectorId}: ${accountValidation.errorMessage}`
      );
      return {
        processed: 0,
        skipped: 0,
        failed: 0,
        errors: [accountValidation.errorMessage],
      };
    }

    // Fetch all deferred payouts for this connector
    const deferredPayouts =
      await this.financesService.getDeferredPayoutsByConnectorId(connectorId);

    if (deferredPayouts.length === 0) {
      this.logger.log(`No deferred payouts found for connector ${connectorId}`);
      return {
        processed: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      };
    }

    this.logger.log(
      `Found ${deferredPayouts.length} deferred payout(s) for connector ${connectorId}`
    );

    let processed = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process each deferred payout using stored data from payout_history
    for (const payout of deferredPayouts) {
      try {
        const requestId = payout.introductionRequestId;

        // Skip if already paid (check payout_history first, then request)
        if (payout.payoutReleased || payout.stripeOutboundPaymentId) {
          this.logger.log(
            `Payout for request ${requestId} already released (payment: ${payout.stripeOutboundPaymentId}), skipping`
          );
          skipped++;
          continue;
        }

        // Minimal validation: check request still exists
        const request = await this.getIntroductionRequest(requestId);

        if (!request) {
          this.logger.warn(
            `Introduction request ${requestId} not found for deferred payout ${payout.id}`
          );
          skipped++;
          continue;
        }

        const requestData = request as AnyType;

        // Double-check request hasn't been paid (defensive check)
        if (requestData.payoutReleased) {
          this.logger.log(
            `Payout for request ${requestId} already released in request table, skipping`
          );
          skipped++;
          continue;
        }

        // Use stored data from payout_history - no recalculation needed
        const payoutTriggeredBy = payout.payoutTriggeredBy || "trust_score";
        const bountyAmount = Number(payout.grossAmount || 0);

        if (bountyAmount === 0) {
          this.logger.error(
            `Payout ${payout.id} has invalid referral payout amount (grossAmount: ${payout.grossAmount})`
          );
          failed++;
          errors.push(`Payout ${payout.id}: Invalid referral payout amount`);
          continue;
        }

        // Determine job type based on stored payoutTriggeredBy
        const jobType =
          payoutTriggeredBy === "peer_feedback"
            ? PAYOUT_JOB_TYPES.FEEDBACK_PAYOUT
            : PAYOUT_JOB_TYPES.TRUST_SCORE_PAYOUT;

        // Create job data using stored information
        const jobData =
          payoutTriggeredBy === "peer_feedback"
            ? ({
                requestId,
                connectorId,
                bountyAmount,
                triggeredAt: toUTC().toISOString(),
              } as FeedbackPayoutJobData)
            : ({
                requestId,
                connectorId,
                bountyAmount,
                triggeredAt: toUTC().toISOString(),
              } as TrustScorePayoutJobData);

        // Directly create the job without calling queue methods that redo checks
        const job = await this.payoutQueue.add(jobType, jobData, {
          ...PAYOUT_QUEUE_CONFIG.defaultJobOptions,
          jobId: `deferred-payout-${requestId}-${toUTC().getTime()}`,
        });

        this.logger.log(
          `Queued deferred ${payoutTriggeredBy} payout for request ${requestId}, job ${job.id}`
        );

        // Update payout_history status to QUEUED with job ID
        await this.financesService.updatePayoutHistoryByRequestId(requestId, {
          processingStatus: PROCESSING_STATUS.QUEUED,
          jobId: job.id,
          payoutTriggeredBy: payoutTriggeredBy as
            | "trust_score"
            | "peer_feedback",
        });

        processed++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(
          `Failed to process deferred payout ${payout.id}: ${errorMessage}`
        );
        failed++;
        errors.push(`Payout ${payout.id}: ${errorMessage}`);
        // Continue processing other payouts even if one fails
      }
    }

    this.logger.log(
      `Completed processing deferred payouts for connector ${connectorId}: ${processed} processed, ${skipped} skipped, ${failed} failed`
    );

    return {
      processed,
      skipped,
      failed,
      errors,
    };
  }

  /**
   * Validates that a connector's Global Payouts recipient account is ready to
   * receive payouts: a recipient account exists, a payout method (bank account)
   * is attached, and the local bank-account capability is active.
   */
  private async validateStripeAccountReady(connectorId: string): Promise<{
    isReady: boolean;
    errorMessage?: string;
  }> {
    const connector = await this.profilesService.getProfileById(connectorId);
    if (!connector) {
      return {
        isReady: false,
        errorMessage: "Connector profile not found",
      };
    }

    if (
      !connector.stripeRecipientAccountId ||
      !connector.stripeRecipientOnboardingComplete
    ) {
      return {
        isReady: false,
        errorMessage: "Payout bank account not connected",
      };
    }

    // Optionally verify with Stripe that the recipient capability is active
    try {
      const account = await this.stripePayoutsService.getRecipientAccount(
        connector.stripeRecipientAccountId
      );

      const capabilityStatus =
        this.stripePayoutsService.getEffectiveBankCapabilityStatus(account);

      if (capabilityStatus !== "active") {
        return {
          isReady: false,
          errorMessage: `Payout capability not active (status: ${capabilityStatus ?? "unknown"})`,
        };
      }

      return {
        isReady: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(
        `Failed to verify recipient account status for connector ${connectorId}: ${errorMessage}`
      );
      // If we can't verify with Stripe, assume account is ready if it exists
      // This prevents blocking payouts due to temporary Stripe API issues
      return {
        isReady: true,
      };
    }
  }

  private async getIntroductionRequest(requestId: string) {
    const [request] = await this.db
      .select()
      .from(schema.introductionRequests)
      .where(eq(schema.introductionRequests.id, requestId))
      .limit(1);
    return request || null;
  }
}
