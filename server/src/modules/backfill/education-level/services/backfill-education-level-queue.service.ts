import {
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import type { BackfillEducationLevelJobData } from "../backfill-education-level-queue.types";
import {
  BACKFILL_EDUCATION_LEVEL_JOB_NAME,
  BACKFILL_EDUCATION_LEVEL_QUEUE_CONFIG,
  BACKFILL_EDUCATION_LEVEL_QUEUE_NAME,
} from "../backfill-education-level.constants";

@Injectable()
export class BackfillEducationLevelQueueService {
  private readonly logger = new Logger(BackfillEducationLevelQueueService.name);

  constructor(
    @Optional()
    @InjectQueue(BACKFILL_EDUCATION_LEVEL_QUEUE_NAME)
    private readonly queue: Queue<BackfillEducationLevelJobData> | undefined
  ) {}

  /** @throws ServiceUnavailableException when queues are not configured */
  async enqueueBackfill(force: boolean): Promise<string> {
    if (!this.queue) {
      this.logger.warn(
        "BACKFILL_EDUCATION_LEVEL_QUEUE_SERVICE :: enqueueBackfill :: queue disabled"
      );
      throw new ServiceUnavailableException(
        "Background queues are disabled. Set ENABLE_QUEUES=true and Redis to run this backfill."
      );
    }

    const job = await this.queue.add(
      BACKFILL_EDUCATION_LEVEL_JOB_NAME,
      { force },
      {
        ...BACKFILL_EDUCATION_LEVEL_QUEUE_CONFIG.defaultJobOptions,
        // Timestamped so repeat manual triggers are never deduped away.
        jobId: `education-level-backfill-${String(Date.now())}`,
      }
    );

    return String(job.id);
  }
}
