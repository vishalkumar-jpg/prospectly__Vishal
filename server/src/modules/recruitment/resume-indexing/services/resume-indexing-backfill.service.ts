import { Injectable, Logger } from "@nestjs/common";
import { ResumeIndexingQueryRepository } from "./resume-indexing-query.repository";
import {
  ResumeIndexingQueueService,
  type ResumeIndexingBackfillPayload,
} from "../resume-indexing-queue.service";
import {
  RESUME_INDEXING_BACKFILL_MAX_PAGE_SIZE,
  RESUME_INDEXING_BACKFILL_PAGE_SIZE,
  RESUME_INDEXING_BACKFILL_STAGGER_MS,
} from "../resume-indexing.constants";

/**
 * Phase 2 machinery. Built now so the queue, scan modes and trigger endpoint
 * exist, but not invoked in Phase 1 — only newly uploaded resumes are indexed.
 */
@Injectable()
export class ResumeIndexingBackfillService {
  private readonly logger = new Logger(ResumeIndexingBackfillService.name);

  constructor(
    private readonly query: ResumeIndexingQueryRepository,
    private readonly queue: ResumeIndexingQueueService
  ) {}

  async scan(payload: ResumeIndexingBackfillPayload): Promise<void> {
    // Clamped both ways: a zero or negative page size would scan nothing and
    // report COMPLETE, which reads as "backfill finished" rather than a fault.
    const pageSize = Math.min(
      Math.max(1, payload.pageSize ?? RESUME_INDEXING_BACKFILL_PAGE_SIZE),
      RESUME_INDEXING_BACKFILL_MAX_PAGE_SIZE
    );
    const cursor = payload.cursor ?? null;
    const jobId = payload.jobId ?? null;
    const scope = `scope=${jobId ?? "all"}`;

    const rows = await this.query.scanForBackfill({
      cursor,
      pageSize,
      force: payload.force ?? false,
      jobId,
    });

    if (rows.length === 0) {
      this.logger.log(
        `RESUME_INDEXING_BACKFILL :: scan : COMPLETE : ${scope} cursor=${cursor ?? "start"}`
      );
      return;
    }

    // Staggered rather than fired at once: a full page is 500 Gemini embedding
    // calls, and a 429 storm is the failure this queue's long backoff exists
    // for. The delay is per job, so the page still drains in order.
    for (const [index, row] of rows.entries()) {
      await this.queue.queueIndexing(
        {
          mediaId: row.mediaId,
          reason: "backfill",
          force: payload.force,
        },
        index * RESUME_INDEXING_BACKFILL_STAGGER_MS
      );
    }

    this.logger.log(
      `RESUME_INDEXING_BACKFILL :: scan : queued=${rows.length} ${scope} cursor=${cursor ?? "start"}`
    );

    // Self-chaining keeps memory bounded and the scan resumable across restarts.
    if (rows.length === pageSize) {
      await this.queue.queueBackfillScan({
        ...payload,
        cursor: rows[rows.length - 1].contactResumeId,
        pageSize,
      });
    }
  }
}
