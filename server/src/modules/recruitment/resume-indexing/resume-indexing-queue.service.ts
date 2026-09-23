import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

import {
  RESUME_INDEXING_QUEUE_JOBS,
  RESUME_INDEXING_QUEUE_NAME,
} from "./resume-indexing.constants";

export type ResumeIndexingReason =
  | "extraction"
  | "reupload"
  | "backfill"
  | "manual";

export interface ResumeIndexingJobPayload {
  /**
   * Keyed on mediaId, not contactResumeId: it is the unique upsert target on
   * contact_resumes and both producers already hold it, so the derived jobId
   * stays stable across the upsert.
   */
  mediaId: string;
  reason: ResumeIndexingReason;
  force?: boolean;
  /** Attribution for ai_usage_logs only. */
  userId?: string;
}

export interface ResumeIndexingBackfillPayload {
  cursor?: string | null;
  force?: boolean;
  pageSize?: number;
  /** Restrict the sweep to one job's resumes. Omit to scan the whole corpus. */
  jobId?: string | null;
}

@Injectable()
export class ResumeIndexingQueueService {
  private readonly logger = new Logger(ResumeIndexingQueueService.name);

  constructor(
    @Optional()
    @InjectQueue(RESUME_INDEXING_QUEUE_NAME)
    private readonly queue?: Queue
  ) {}

  getIndexJobId(mediaId: string): string {
    return `resume-index-${mediaId}`;
  }

  /**
   * Must be called only after the transaction that wrote contact_resumes has
   * committed. Redis and Postgres are separate systems, so a job enqueued
   * mid-transaction can be picked up before the commit lands and index
   * pre-commit state.
   */
  async queueIndexing(
    payload: ResumeIndexingJobPayload,
    delayMs?: number
  ): Promise<void> {
    if (!this.queue) {
      this.logger.warn(
        `RESUME_INDEXING_QUEUE :: queueIndexing : QUEUE_DISABLED : mediaId=${payload.mediaId}`
      );
      return;
    }

    const jobId = this.getIndexJobId(payload.mediaId);
    await this.clearFinishedJob(jobId);

    // Retention comes from RESUME_INDEXING_QUEUE_CONFIG.defaultJobOptions.
    // BullMQ replaces per-key rather than merging, so overriding
    // removeOnComplete here would silently discard the configured window.
    await this.queue.add(RESUME_INDEXING_QUEUE_JOBS.INDEX, payload, {
      jobId,
      ...(delayMs ? { delay: delayMs } : {}),
    });

    this.logger.log(
      `RESUME_INDEXING_QUEUE :: queueIndexing : mediaId=${payload.mediaId} reason=${payload.reason}`
    );
  }

  async queueBackfillScan(
    payload: ResumeIndexingBackfillPayload
  ): Promise<void> {
    if (!this.queue) {
      this.logger.warn(
        "RESUME_INDEXING_QUEUE :: queueBackfillScan : QUEUE_DISABLED"
      );
      return;
    }

    // Scope is part of the key: without it two different jobs both starting at
    // a null cursor would collide on `…-start`, and BullMQ would silently drop
    // the second — the first per-job backfill after another would never run.
    const jobId = `resume-index-backfill-${payload.jobId ?? "all"}-${payload.cursor ?? "start"}`;
    await this.clearFinishedJob(jobId);

    await this.queue.add(RESUME_INDEXING_QUEUE_JOBS.BACKFILL_SCAN, payload, {
      jobId,
    });
  }

  /**
   * BullMQ silently ignores an add whose jobId still exists, so a completed or
   * failed job's lingering id would swallow every later request for the same
   * resume.
   *
   * An `active` job is deliberately left alone — remove() throws on a locked
   * job, and the runner's updated_at staleness guard already covers that case:
   * the in-flight job's write is rejected and its retry picks up the new row.
   * A `waiting`/`delayed` job has not read anything yet, so it is correct as-is.
   */
  private async clearFinishedJob(jobId: string): Promise<void> {
    if (!this.queue) return;

    try {
      const existing = await this.queue.getJob(jobId);
      if (!existing) return;

      const state = await existing.getState();
      if (state === "completed" || state === "failed") {
        await existing.remove();
      }
    } catch (error) {
      // A job can become active between getState() and remove(). Falling
      // through leaves the add as a no-op, which the staleness guard handles.
      this.logger.warn(
        `RESUME_INDEXING_QUEUE :: clearFinishedJob : SKIPPED : jobId=${jobId} ${error}`
      );
    }
  }
}
