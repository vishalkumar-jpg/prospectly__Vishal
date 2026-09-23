import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger, Inject } from "@nestjs/common";
import { Job } from "bullmq";
import { ResponseRateRecoveryService } from "modules/cron/trust-score/response-rate-recovery.service";
import {
  TRUST_SCORE_QUEUE_NAME,
  TRUST_SCORE_JOB_TYPES,
} from "./trust-score-queue.constants";
import {
  TrustScoreQueueJobData,
  TrustScoreJobResult,
  FeedbackTrustScoreJobData,
  SuccessRateTrustScoreJobData,
  ResponseRateRecoveryJobData,
} from "./trust-score-queue.types";
import { TrustScoreService } from "./trust-score.service";
import { FeedbackTrustScoreService } from "./feedback-trust-score.service";
import { SuccessRateTrustScoreService } from "./success-rate-trust-score.service";

@Processor(TRUST_SCORE_QUEUE_NAME)
export class TrustScoreQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(TrustScoreQueueProcessor.name);

  constructor(
    @Inject(TrustScoreService)
    private readonly trustScoreService: TrustScoreService,
    @Inject(FeedbackTrustScoreService)
    private readonly feedbackTrustScoreService: FeedbackTrustScoreService,
    @Inject(SuccessRateTrustScoreService)
    private readonly successRateTrustScoreService: SuccessRateTrustScoreService,
    @Inject(ResponseRateRecoveryService)
    private readonly responseRateRecoveryService: ResponseRateRecoveryService
  ) {
    super();
  }

  async process(
    job: Job<
      | TrustScoreQueueJobData
      | FeedbackTrustScoreJobData
      | SuccessRateTrustScoreJobData
      | ResponseRateRecoveryJobData
    >
  ): Promise<TrustScoreJobResult | void> {
    const { id, name, data } = job;

    // Handle feedback trust score calculation jobs
    if (name === TRUST_SCORE_JOB_TYPES.FEEDBACK_TRUST_SCORE_CALCULATION) {
      const feedbackData = data as FeedbackTrustScoreJobData;

      try {
        await this.feedbackTrustScoreService.processFeedbackTrustScore(
          feedbackData
        );
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(
          `Feedback trust score job ${id} failed: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined
        );
        throw error;
      }
    }

    // Handle success rate trust score calculation jobs
    if (name === TRUST_SCORE_JOB_TYPES.SUCCESS_RATE_CALCULATION) {
      const successRateData = data as SuccessRateTrustScoreJobData;

      try {
        await this.successRateTrustScoreService.processSuccessRateTrustScore(
          successRateData.connectorId
        );
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(
          `Success rate trust score job ${id} failed: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined
        );
        throw error;
      }
    }

    // Handle response rate recovery check jobs
    if (name === TRUST_SCORE_JOB_TYPES.RESPONSE_RATE_RECOVERY) {
      const recoveryData = data as ResponseRateRecoveryJobData;

      try {
        await this.responseRateRecoveryService.checkAndRestorePointsForConnector(
          recoveryData.connectorId
        );
        this.logger.log(
          `Response rate recovery job ${id} completed for connector ${recoveryData.connectorId}`
        );
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(
          `Response rate recovery job ${id} failed: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined
        );
        throw error;
      }
    }

    // Handle regular trust score event jobs
    const trustScoreData = data as TrustScoreQueueJobData;
    this.logger.log(
      `Processing trust score job ${id} for user ${trustScoreData.userId}, trigger: ${trustScoreData.triggerEvent}`
    );

    try {
      const result =
        await this.trustScoreService.processTrustScoreEvent(trustScoreData);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Trust score job ${id} failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(
    job: Job<
      | TrustScoreQueueJobData
      | FeedbackTrustScoreJobData
      | SuccessRateTrustScoreJobData
      | ResponseRateRecoveryJobData
    >
  ) {
    if (job.name === TRUST_SCORE_JOB_TYPES.FEEDBACK_TRUST_SCORE_CALCULATION) {
      const feedbackData = job.data as FeedbackTrustScoreJobData;
      this.logger.log(
        `Feedback trust score job ${job.id} completed successfully for connector ${feedbackData.connectorId}`
      );
    } else if (job.name === TRUST_SCORE_JOB_TYPES.SUCCESS_RATE_CALCULATION) {
      const successRateData = job.data as SuccessRateTrustScoreJobData;
      this.logger.log(
        `Success rate trust score job ${job.id} completed successfully for connector ${successRateData.connectorId}`
      );
    } else if (job.name === TRUST_SCORE_JOB_TYPES.RESPONSE_RATE_RECOVERY) {
      const recoveryData = job.data as ResponseRateRecoveryJobData;
      this.logger.log(
        `Response rate recovery job ${job.id} completed successfully for connector ${recoveryData.connectorId}`
      );
    } else {
      const trustScoreData = job.data as TrustScoreQueueJobData;
      this.logger.log(
        `Trust score job ${job.id} completed successfully for user ${trustScoreData.userId}`
      );
    }
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Trust score job ${job?.id} failed: ${error.message}`,
      error.stack
    );
  }

  @OnWorkerEvent("stalled")
  onStalled(jobId: string) {
    this.logger.warn(`Trust score job ${jobId} stalled - will be retried`);
  }
}
