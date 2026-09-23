import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job, UnrecoverableError } from "bullmq";
import { describeDbError } from "utils/db-error.utils";

import type {
  ResumeIndexingBackfillPayload,
  ResumeIndexingJobPayload,
} from "./resume-indexing-queue.service";
import {
  RESUME_INDEXING_QUEUE_JOBS,
  RESUME_INDEXING_QUEUE_NAME,
} from "./resume-indexing.constants";
import { ResumeIndexingRunnerService } from "./services/resume-indexing-runner.service";
import { ResumeIndexingBackfillService } from "./services/resume-indexing-backfill.service";

type ResumeIndexingJobData =
  | ResumeIndexingJobPayload
  | ResumeIndexingBackfillPayload;

@Processor(RESUME_INDEXING_QUEUE_NAME)
export class ResumeIndexingQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(ResumeIndexingQueueProcessor.name);

  constructor(
    private readonly runner: ResumeIndexingRunnerService,
    private readonly backfill: ResumeIndexingBackfillService
  ) {
    super();
  }

  async process(job: Job<ResumeIndexingJobData>): Promise<void> {
    try {
      if (job.name === RESUME_INDEXING_QUEUE_JOBS.INDEX) {
        await this.runner.indexOne(job.data as ResumeIndexingJobPayload);
        return;
      }

      if (job.name === RESUME_INDEXING_QUEUE_JOBS.BACKFILL_SCAN) {
        await this.backfill.scan(job.data as ResumeIndexingBackfillPayload);
        return;
      }

      // Unrecoverable, not an Error: no retry can make an unknown job name
      // valid, and the default policy would burn four attempts over ~8 minutes.
      throw new UnrecoverableError(`Unsupported job name: ${job.name}`);
    } catch (error) {
      // describeDbError returns a message only, so the stack has to come from
      // the second argument or it is lost entirely.
      this.logger.error(
        `RESUME_INDEXING_PROCESSOR :: process : ERROR : job=${job.name} ${describeDbError(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }
}
