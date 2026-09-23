import { Injectable, Inject, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue, Job } from "bullmq";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import { ProfilesService } from "modules/profiles/profiles.service";
import { convertToCents } from "modules/payments/utils/payment-calculations.util";
import { toUTC } from "utils/dayjs";
import {
  RECRUITMENT_PAYOUT_QUEUE_NAME,
  RECRUITMENT_PAYOUT_JOB_TYPES,
  RECRUITMENT_PAYOUT_QUEUE_CONFIG,
  RECRUITMENT_PROCESSING_STATUS,
} from "../payout/recruitment-payout.constants";
import { RecruitmentPayoutJobData } from "../payout/recruitment-payout.types";

@Injectable()
export class RecruitmentPayoutQueueService {
  private readonly logger = new Logger(RecruitmentPayoutQueueService.name);

  constructor(
    @InjectQueue(RECRUITMENT_PAYOUT_QUEUE_NAME)
    private readonly payoutQueue: Queue,
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly profilesService: ProfilesService
  ) {}

  /**
   * Queue a payout job with optional delay (for 25h dispute window).
   */
  async queuePayoutJob(
    data: RecruitmentPayoutJobData,
    delayMs?: number
  ): Promise<Job> {
    const jobId = `recruitment-payout-${data.payoutId}-${Date.now()}`;

    const job = await this.payoutQueue.add(
      RECRUITMENT_PAYOUT_JOB_TYPES.PROCESS_PAYOUT,
      data,
      {
        ...RECRUITMENT_PAYOUT_QUEUE_CONFIG.defaultJobOptions,
        jobId,
        ...(delayMs && delayMs > 0 ? { delay: delayMs } : {}),
      }
    );

    this.logger.log(
      `Queued recruitment payout job ${job.id} for payout ${data.payoutId}${delayMs ? ` with ${Math.round(delayMs / 1000 / 60)}min delay` : ""}`
    );

    return job;
  }

  /**
   * Process all deferred (onboarding_pending) payouts for a recipient
   * who just completed Stripe Connect onboarding.
   */
  async processDeferredPayoutsForRecipient(recipientId: string): Promise<{
    processed: number;
    failed: number;
    errors: string[];
  }> {
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    // Validate Stripe account is ready
    const isReady = await this.validateStripeAccountReady(recipientId);
    if (!isReady) {
      return { processed: 0, failed: 0, errors: ["Stripe account not ready"] };
    }

    // Fetch all onboarding_pending payouts for this recipient
    const deferredPayouts = await this.db
      .select()
      .from(schema.recruitmentPayoutHistory)
      .where(
        and(
          eq(schema.recruitmentPayoutHistory.recipientId, recipientId),
          eq(
            schema.recruitmentPayoutHistory.processingStatus,
            RECRUITMENT_PROCESSING_STATUS.ONBOARDING_PENDING
          ),
          isNull(schema.recruitmentPayoutHistory.deletedAt)
        )
      );

    for (const payout of deferredPayouts) {
      try {
        if (payout.stripeOutboundPaymentId) {
          continue; // Already processed
        }

        const jobData: RecruitmentPayoutJobData = {
          payoutId: payout.id,
          candidateId: payout.candidateId,
          jobId: payout.jobId,
          recipientId,
          payoutType: payout.payoutType,
          grossAmountCents: convertToCents(payout.grossAmount),
          triggeredAt: toUTC().toISOString(),
        };

        // No delay — already past the dispute window
        const job = await this.queuePayoutJob(jobData);

        await this.db
          .update(schema.recruitmentPayoutHistory)
          .set({
            processingStatus: RECRUITMENT_PROCESSING_STATUS.QUEUED,
            queueJobId: job.id,
            updatedAt: toUTC(),
          })
          .where(eq(schema.recruitmentPayoutHistory.id, payout.id));

        processed++;
      } catch (error) {
        failed++;
        errors.push(
          `Payout ${payout.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        this.logger.error(
          `RECRUITMENT_PAYOUT_QUEUE :: processDeferredPayoutsForRecipient : ERROR : Payout ${payout.id}: ${error}`
        );
      }
    }

    return { processed, failed, errors };
  }

  /**
   * Check if recipient has a payout-ready Global Payouts account: a recipient
   * account exists and a bank payout method has been attached.
   */
  async validateStripeAccountReady(recipientId: string): Promise<boolean> {
    try {
      const profile = await this.profilesService.getProfileById(recipientId);
      return !!(
        profile?.stripeRecipientAccountId &&
        profile?.stripeRecipientOnboardingComplete
      );
    } catch {
      return false;
    }
  }
}
