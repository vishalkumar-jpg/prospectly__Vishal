import { Injectable, Inject, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";
import { AnyType } from "types/common";
import { ProfilesService } from "modules/profiles/profiles.service";
import { FinancesService } from "modules/finances/finances.service";
import {
  PAYOUT_QUEUE_NAME,
  PAYOUT_JOB_TYPES,
  PROCESSING_STATUS,
  PAYOUT_QUEUE_CONFIG,
} from "modules/payout-queue/payout-queue.constants";
import { FeedbackPayoutJobData } from "modules/payout-queue/payout-queue.types";
import {
  calculatePayoutSplit,
  convertToCents,
  convertToDollars,
} from "modules/payments/utils/payment-calculations.util";

export interface FeedbackPayoutResult {
  queued: boolean;
  jobId?: string;
  message: string;
}

@Injectable()
export class FeedbackPayoutHelper {
  private readonly logger = new Logger(FeedbackPayoutHelper.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly profilesService: ProfilesService,
    private readonly financesService: FinancesService,
    @InjectQueue(PAYOUT_QUEUE_NAME) private readonly payoutQueue: Queue
  ) {}

  /**
   * Queues feedback-triggered payout after connector submits peer feedback
   */
  async queueFeedbackPayout(requestId: string): Promise<FeedbackPayoutResult> {
    const requestData = await this.getIntroductionRequest(requestId);

    if (!requestData) {
      return { queued: false, message: "Request not found" };
    }

    const request = requestData as AnyType;
    if (request.payoutReleased) {
      return { queued: false, message: "Payout already released" };
    }

    if (!request.connectorFeedbackSubmitted) {
      return { queued: false, message: "Connector feedback not submitted" };
    }

    const connectorId = request.acceptedBy;
    if (!connectorId) {
      return { queued: false, message: "No connector found" };
    }

    const connector = await this.profilesService.getProfileById(connectorId);
    if (
      !connector?.stripeRecipientAccountId ||
      !connector?.stripeRecipientOnboardingComplete
    ) {
      await this.handleMissingStripeAccount(
        requestId,
        connectorId,
        request.bountyAmount
      );
      return {
        queued: false,
        message: "Connector does not have Stripe account - payout deferred",
      };
    }

    return this.createAndQueuePayoutJob(
      requestId,
      connectorId,
      request.bountyAmount
    );
  }

  /**
   * Handles case when connector doesn't have Stripe account
   */
  private async handleMissingStripeAccount(
    requestId: string,
    connectorId: string,
    bountyAmount: number | string
  ): Promise<void> {
    const trustScore = await this.getConnectorTrustScore(connectorId);
    await this.createPendingPayoutRecord(requestId, connectorId, bountyAmount);
    await this.updateIntroductionRequest(requestId, {
      payoutEligible: true,
      connectorTrustScoreAtPayout: trustScore,
    });
  }

  /**
   * Creates and queues the payout job
   */
  private async createAndQueuePayoutJob(
    requestId: string,
    connectorId: string,
    bountyAmount: number | string
  ): Promise<FeedbackPayoutResult> {
    const parsedAmount = Number(bountyAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error(`Invalid referral payout amount: ${bountyAmount}`);
    }

    const jobData: FeedbackPayoutJobData = {
      requestId,
      connectorId,
      bountyAmount: parsedAmount,
      triggeredAt: toUTC().toISOString(),
    };

    const job = await this.payoutQueue.add(
      PAYOUT_JOB_TYPES.FEEDBACK_PAYOUT,
      jobData,
      {
        ...PAYOUT_QUEUE_CONFIG.defaultJobOptions,
        jobId: `feedback-payout-${requestId}`,
      }
    );

    this.logger.log(
      `Queued feedback payout job ${job.id} for request ${requestId}`
    );

    await this.financesService.updatePayoutHistoryByRequestId(requestId, {
      processingStatus: PROCESSING_STATUS.QUEUED,
      jobId: job.id,
      payoutTriggeredBy: "peer_feedback",
    });

    return {
      queued: true,
      jobId: job.id,
      message: "Payout queued for processing",
    };
  }

  /**
   * Gets connector trust score from profile
   */
  private async getConnectorTrustScore(
    connectorId: string
  ): Promise<number | null> {
    const profile = await this.profilesService.getProfileById(connectorId);
    return profile?.trustScore ?? null;
  }

  private async getIntroductionRequest(requestId: string) {
    const [request] = await this.db
      .select()
      .from(schema.introductionRequests)
      .where(eq(schema.introductionRequests.id, requestId))
      .limit(1);
    return request || null;
  }

  private async updateIntroductionRequest(
    requestId: string,
    data: AnyType
  ): Promise<void> {
    await this.db
      .update(schema.introductionRequests)
      .set({ ...data, updatedAt: toUTC() })
      .where(eq(schema.introductionRequests.id, requestId));
  }

  private async createPendingPayoutRecord(
    requestId: string,
    connectorId: string,
    bountyAmount: number | string
  ): Promise<void> {
    const totalCapturedCents = convertToCents(Number(bountyAmount));
    const payoutSplit = calculatePayoutSplit(totalCapturedCents);

    await this.financesService.upsertPayoutHistory(requestId, connectorId, {
      grossAmount: String(bountyAmount),
      platformCommissionAmount: convertToDollars(
        payoutSplit.platformAmountCents
      ).toString(),
      netAmount: convertToDollars(payoutSplit.connectorAmountCents).toString(),
      payoutEligible: true,
      processingStatus: PROCESSING_STATUS.ONBOARDING_PENDING,
      errorMessage: "Waiting for Stripe Connect account onboarding",
    });
  }
}
