import {
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import type { BackfillScoreBreakdownJobData } from "../backfill-score-breakdown-queue.types";
import {
  BACKFILL_SCORE_BREAKDOWN_QUEUE_NAME,
  BACKFILL_SCORE_BREAKDOWN_JOB_NAME,
  BACKFILL_SCORE_BREAKDOWN_QUEUE_CONFIG,
} from "../backfill-score-breakdown-queue.constants";

@Injectable()
export class BackfillScoreBreakdownQueueService {
  private readonly logger = new Logger(BackfillScoreBreakdownQueueService.name);

  constructor(
    @Optional()
    @InjectQueue(BACKFILL_SCORE_BREAKDOWN_QUEUE_NAME)
    private readonly queue: Queue<BackfillScoreBreakdownJobData> | undefined
  ) {}

  /**
   * @throws ServiceUnavailableException when queues are not configured
   */
  async enqueueBackfill(jobIds: string[], force: boolean): Promise<string> {
    if (!this.queue) {
      this.logger.warn(
        "BACKFILL_SCORE_BREAKDOWN_QUEUE_SERVICE :: enqueueBackfill :: queue disabled"
      );
      throw new ServiceUnavailableException(
        "Background queues are disabled. Set ENABLE_QUEUES=true and Redis to run this backfill."
      );
    }

    const job = await this.queue.add(
      BACKFILL_SCORE_BREAKDOWN_JOB_NAME,
      { jobIds, force },
      {
        ...BACKFILL_SCORE_BREAKDOWN_QUEUE_CONFIG.defaultJobOptions,
        // Timestamped so repeat manual triggers are never deduped away.
        jobId: `score-breakdown-backfill-${String(Date.now())}`,
      }
    );

    const queuedJobId = job.id ?? "";
    this.logger.log(
      `BACKFILL_SCORE_BREAKDOWN_QUEUE_SERVICE :: enqueueBackfill :: jobId=${queuedJobId} jobIds=${String(jobIds.length)} force=${String(force)}`
    );
    return queuedJobId;
  }
}
