import { Injectable, Logger } from "@nestjs/common";
import { toUTC } from "utils/dayjs";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  TRUST_SCORE_QUEUE_NAME,
  TRUST_SCORE_QUEUE_CONFIG,
  TRUST_SCORE_JOB_TYPES,
} from "./trust-score-queue.constants";
import {
  TrustScoreQueueJobData,
  FeedbackTrustScoreJobData,
  SuccessRateTrustScoreJobData,
  ResponseRateRecoveryJobData,
} from "./trust-score-queue.types";

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
export class TrustScoreQueueService {
  private readonly logger = new Logger(TrustScoreQueueService.name);

  constructor(
    @InjectQueue(TRUST_SCORE_QUEUE_NAME)
    private readonly queue: Queue<
      | TrustScoreQueueJobData
      | FeedbackTrustScoreJobData
      | SuccessRateTrustScoreJobData
      | ResponseRateRecoveryJobData
    >
  ) {}

  async enqueueTrustScoreEvent(
    userId: string,
    triggerEvent: string,
    evidence: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    this.logger.log(
      `Queueing trust score event for user ${userId}, trigger: ${triggerEvent}`
    );

    const jobData: TrustScoreQueueJobData = {
      userId,
      triggerEvent,
      evidence,
      metadata,
      triggeredAt: toUTC(),
    };

    const job = await this.queue.add(triggerEvent, jobData, {
      ...TRUST_SCORE_QUEUE_CONFIG.defaultJobOptions,
      jobId: `trust-score-${userId}-${triggerEvent}-${toUTC().getTime()}`,
    });

    this.logger.log(
      `Trust score job queued with ID: ${job.id} for user ${userId}, trigger: ${triggerEvent}`
    );

    return job.id || "";
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const job = await this.queue.getJob(jobId);
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
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
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
   * Queue feedback trust score calculation job
   * This job calculates and toggles trust score credits based on peer feedback average
   */
  async enqueueFeedbackTrustScoreCalculation(
    connectorId: string,
    feedbackId: string,
    requestId: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    this.logger.log(
      `Queueing feedback trust score calculation for connector ${connectorId}, feedback ${feedbackId}`
    );

    const jobData: FeedbackTrustScoreJobData = {
      connectorId,
      feedbackId,
      requestId,
      metadata: metadata as FeedbackTrustScoreJobData["metadata"],
      triggeredAt: toUTC(),
    };

    const job = await this.queue.add(
      TRUST_SCORE_JOB_TYPES.FEEDBACK_TRUST_SCORE_CALCULATION,
      jobData,
      {
        ...TRUST_SCORE_QUEUE_CONFIG.defaultJobOptions,
        jobId: `feedback-trust-score-${connectorId}-${feedbackId}-${toUTC().getTime()}`,
        priority: 1, // HIGH priority - should process before payout
      }
    );

    this.logger.log(
      `Feedback trust score job queued with ID: ${job.id} for connector ${connectorId}`
    );

    return job.id || "";
  }

  /**
   * Queue success rate trust score calculation job
   * This job calculates and toggles trust score credits based on introduction success rate
   */
  async enqueueSuccessRateTrustScoreCalculation(
    connectorId: string,
    triggerReason: "request_completed" | "request_failed" | "scheduled_check",
    requestId?: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    this.logger.log(
      `Queueing success rate trust score calculation for connector ${connectorId}, reason: ${triggerReason}`
    );

    const jobData: SuccessRateTrustScoreJobData = {
      connectorId,
      triggeredAt: toUTC(),
      metadata: {
        triggerReason,
        requestId,
        ...metadata,
      },
    };

    const job = await this.queue.add(
      TRUST_SCORE_JOB_TYPES.SUCCESS_RATE_CALCULATION,
      jobData,
      {
        ...TRUST_SCORE_QUEUE_CONFIG.defaultJobOptions,
        jobId: `success-rate-${connectorId}-${toUTC().getTime()}`,
        priority: 2, // Medium priority
      }
    );

    this.logger.log(
      `Success rate trust score job queued with ID: ${job.id} for connector ${connectorId}`
    );

    return job.id || "";
  }

  /**
   * Queue response rate recovery check job
   * This job checks if a connector who was penalized has improved their response rate
   * and restores points if they meet the threshold
   */
  async enqueueResponseRateRecoveryCheck(
    connectorId: string,
    triggerReason: "connector_accepted" | "connector_declined",
    requestId?: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    this.logger.log(
      `Queueing response rate recovery check for connector ${connectorId}, reason: ${triggerReason}`
    );

    const jobData: ResponseRateRecoveryJobData = {
      connectorId,
      triggeredAt: toUTC(),
      metadata: {
        triggerReason,
        requestId,
        ...metadata,
      },
    };

    const job = await this.queue.add(
      TRUST_SCORE_JOB_TYPES.RESPONSE_RATE_RECOVERY,
      jobData,
      {
        ...TRUST_SCORE_QUEUE_CONFIG.defaultJobOptions,
        jobId: `response-recovery-${connectorId}-${toUTC().getTime()}`,
        priority: 2, // Medium priority
      }
    );

    this.logger.log(
      `Response rate recovery job queued with ID: ${job.id} for connector ${connectorId}`
    );

    return job.id || "";
  }
}
