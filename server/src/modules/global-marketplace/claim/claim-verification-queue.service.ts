import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  CLAIM_VERIFICATION_QUEUE_NAME,
  CLAIM_VERIFICATION_JOB_TYPES,
  CLAIM_VERIFICATION_QUEUE_CONFIG,
  ImportSource,
} from "./claim-verification.constants";
import { VerificationJobData } from "./claim-verification.types";

@Injectable()
export class ClaimVerificationQueueService {
  private readonly logger = new Logger(ClaimVerificationQueueService.name);

  constructor(
    @InjectQueue(CLAIM_VERIFICATION_QUEUE_NAME)
    private readonly queue: Queue<VerificationJobData>
  ) {}

  /**
   * Enqueue a verification job after contact import completes
   */
  async enqueueVerification(
    userId: string,
    introductionRequestId: string,
    source: ImportSource
  ): Promise<string> {
    const job = await this.queue.add(
      CLAIM_VERIFICATION_JOB_TYPES.VERIFY_CONTACT_MATCH,
      {
        userId,
        introductionRequestId,
        source,
      },
      CLAIM_VERIFICATION_QUEUE_CONFIG.defaultJobOptions
    );

    this.logger.log(
      `Queued verification job ${job.id} for user ${userId}, request ${introductionRequestId}, source ${source}`
    );

    return job.id || "";
  }

  /**
   * Get job status by ID
   */
  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    return {
      id: job.id,
      name: job.name,
      state,
      progress: job.progress,
      returnValue: job.returnvalue,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    };
  }
}
