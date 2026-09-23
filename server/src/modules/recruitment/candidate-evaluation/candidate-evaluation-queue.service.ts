import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

import {
  CANDIDATE_EVALUATION_QUEUE_NAME,
  CANDIDATE_EVALUATION_QUEUE_JOBS,
} from "./candidate-evaluation.constants";

export interface CandidateEvaluationJobPayload {
  candidateId: string;
  jobId: string;
  userId: string;
}

@Injectable()
export class CandidateEvaluationQueueService {
  private readonly logger = new Logger(CandidateEvaluationQueueService.name);

  constructor(
    @InjectQueue(CANDIDATE_EVALUATION_QUEUE_NAME)
    private readonly queue: Queue
  ) {}

  async queueAnalysis(payload: CandidateEvaluationJobPayload): Promise<void> {
    // No delay needed: this is enqueued by the resume-extraction processor
    // after the extraction has been persisted, so ordering is explicit rather
    // than raced.
    await this.queue.add(CANDIDATE_EVALUATION_QUEUE_JOBS.ANALYZE, payload, {
      jobId: this.getEvaluationJobId(payload.candidateId),
      removeOnComplete: true, // Clean up completed jobs to avoid accumulation
    });

    this.logger.log(
      `CANDIDATE_EVALUATION_QUEUE :: Queued analysis for candidate ${payload.candidateId} on job ${payload.jobId}`
    );
  }

  getEvaluationJobId(candidateId: string): string {
    return `candidate-evaluation-${candidateId}`;
  }

  /**
   * Retry a previously-failed BullMQ job by candidateId. Returns true if the
   * original job was found; false if evicted from Redis.
   */
  async retryExistingJob(candidateId: string): Promise<boolean> {
    const job = await this.queue.getJob(this.getEvaluationJobId(candidateId));
    if (!job) return false;
    const state = await job.getState();
    if (state === "failed") {
      await job.retry();
    }
    return true;
  }
}
