import { Injectable, Inject, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { ProfilesService } from "modules/profiles/profiles.service";
import { FinancesService } from "modules/finances/finances.service";
import {
  PAYOUT_QUEUE_NAME,
  PAYOUT_JOB_TYPES,
  PAYOUT_QUEUE_CONFIG,
} from "modules/payout-queue/payout-queue.constants";
import { TrustScorePayoutJobData } from "modules/payout-queue/payout-queue.types";
import { toUTC } from "utils/dayjs";
import { PayoutRecordHelper } from "./meeting-record.helper";

export interface PayoutResult {
  queued: boolean;
  immediate: boolean;
  jobId?: string;
  message: string;
}

@Injectable()
export class PayoutProcessorHelper {
  private readonly logger = new Logger(PayoutProcessorHelper.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly profilesService: ProfilesService,
    private readonly financesService: FinancesService,
    @InjectQueue(PAYOUT_QUEUE_NAME) private readonly payoutQueue: Queue,
    private readonly payoutRecordHelper: PayoutRecordHelper
  ) {}

  /**
   * Queues trust-score-based payout for immediate processing
   */
  async proceedPayout(
    requestId: string,
    trustScore: number
  ): Promise<PayoutResult> {
    const requestData = await this.getIntroductionRequest(requestId);
    if (!requestData) {
      return { queued: false, immediate: false, message: "Request not found" };
    }

    const request = requestData as AnyType;
    if (request.payoutReleased) {
      return {
        queued: false,
        immediate: false,
        message: "Payout already released",
      };
    }

    const validationResult = await this.validatePaymentCapture(requestId);
    if (!validationResult.valid) {
      return {
        queued: false,
        immediate: false,
        message: validationResult.message,
      };
    }

    const connectorId = request.acceptedBy;
    const connector = await this.profilesService.getProfileById(connectorId);

    if (
      !connector?.stripeRecipientAccountId ||
      !connector?.stripeRecipientOnboardingComplete
    ) {
      await this.payoutRecordHelper.createPendingPayoutRecord(
        requestId,
        connectorId,
        request.bountyAmount
      );
      return {
        queued: false,
        immediate: false,
        message: "Connector does not have Stripe account",
      };
    }

    return this.queuePayoutJob(
      requestId,
      connectorId,
      request.bountyAmount,
      trustScore
    );
  }

  /**
   * Validates that all payment stages have been captured
   */
  private async validatePaymentCapture(
    requestId: string
  ): Promise<{ valid: boolean; message: string }> {
    const transaction =
      await this.financesService.getIntroductionTransactionByRequestId(
        requestId
      );

    if (!transaction) {
      return { valid: false, message: "Transaction not found" };
    }

    const transactionId = transaction.id as string;
    const paymentStages =
      await this.financesService.getPaymentStagesByTransactionId(transactionId);

    const initialStage = paymentStages.find(
      (s) => s.stageName === "intro_email_sent"
    );
    const remainingStage = paymentStages.find(
      (s) => s.stageName === "meeting_booked"
    );

    const initialCaptured = !!initialStage?.capturedAt;
    const remainingCaptured = !!remainingStage?.capturedAt;

    if (!initialCaptured || !remainingCaptured) {
      return { valid: false, message: "All payments must be captured first" };
    }

    return { valid: true, message: "Payment validation passed" };
  }

  /**
   * Queues the payout job and creates the record
   */
  private async queuePayoutJob(
    requestId: string,
    connectorId: string,
    bountyAmount: number | string,
    trustScore: number
  ): Promise<PayoutResult> {
    const parsedAmount = Number(bountyAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error(`Invalid referral payout amount: ${bountyAmount}`);
    }

    const jobData: TrustScorePayoutJobData = {
      requestId,
      connectorId,
      bountyAmount: parsedAmount,
      triggeredAt: toUTC().toISOString(),
    };

    const job = await this.payoutQueue.add(
      PAYOUT_JOB_TYPES.TRUST_SCORE_PAYOUT,
      jobData,
      {
        ...PAYOUT_QUEUE_CONFIG.defaultJobOptions,
        jobId: `trust-payout-${requestId}`,
      }
    );

    this.logger.log(
      `Queued trust-score payout job ${job.id} for request ${requestId}`
    );

    await this.payoutRecordHelper.createQueuedPayoutRecord(
      requestId,
      connectorId,
      bountyAmount,
      job.id!,
      trustScore
    );

    return {
      queued: true,
      immediate: true,
      jobId: job.id,
      message: "Payout queued for immediate processing",
    };
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
