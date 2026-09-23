import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  CONNECTOR_UPLOAD_QUEUE_NAME,
  CONNECTOR_UPLOAD_QUEUE_JOBS,
} from "./connector-upload.constants";

export interface ConnectorUploadJobPayload {
  jobId: string;
  connectorUserId: string;
  mediaId: string;
  filePath: string;
  uploadJobId: string;
  connectorEmail: string;
}

export interface ConnectorReplaceResumeJobPayload {
  jobId: string;
  connectorUserId: string;
  mediaId: string;
  uploadJobId: string;
  matchId: string;
  contactId: number;
  preReplacePoolStatus: string;
  candidateId?: string | null;
}

@Injectable()
export class ConnectorUploadQueueService {
  constructor(
    @InjectQueue(CONNECTOR_UPLOAD_QUEUE_NAME)
    private readonly queue: Queue
  ) {}

  async queueResumeProcessing(
    payload: ConnectorUploadJobPayload
  ): Promise<void> {
    // Use uploadJobId as BullMQ jobId so we can look up the original job's
    // data later (e.g. from the user-initiated retry endpoint) without
    // persisting the candidate email in the database.
    await this.queue.add(CONNECTOR_UPLOAD_QUEUE_JOBS.PROCESS_RESUME, payload, {
      delay: 2000,
      jobId: payload.uploadJobId,
    });
  }

  async queueReplaceResume(
    payload: ConnectorReplaceResumeJobPayload
  ): Promise<void> {
    await this.queue.add(CONNECTOR_UPLOAD_QUEUE_JOBS.REPLACE_RESUME, payload, {
      delay: 2000,
      jobId: `replace-${payload.uploadJobId}`,
    });
  }

  /**
   * Retry a previously-failed BullMQ job by its uploadJobId (which equals the
   * BullMQ jobId). Returns true if the original job was found and retried;
   * false if the job has been evicted from Redis and is unrecoverable.
   */
  async retryExistingJob(uploadJobId: string): Promise<boolean> {
    const job =
      (await this.queue.getJob(`replace-${uploadJobId}`)) ??
      (await this.queue.getJob(uploadJobId));
    if (!job) return false;
    const state = await job.getState();
    if (state === "failed") {
      await job.retry();
    } else {
      // Not failed (e.g. still active, completed, or waiting) — nothing to do.
    }
    return true;
  }
}
