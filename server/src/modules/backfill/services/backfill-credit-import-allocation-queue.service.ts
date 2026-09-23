import {
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import type { BackfillCreditImportAllocationJobData } from "../backfill-credit-import-allocation-queue.types";
import {
  BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_NAME,
  BACKFILL_CREDIT_IMPORT_ALLOCATION_JOB_NAME,
  BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_CONFIG,
} from "../backfill-credit-import-allocation-queue.constants";

@Injectable()
export class BackfillCreditImportAllocationQueueService {
  private readonly logger = new Logger(
    BackfillCreditImportAllocationQueueService.name
  );

  constructor(
    @Optional()
    @InjectQueue(BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_NAME)
    private readonly queue:
      | Queue<BackfillCreditImportAllocationJobData>
      | undefined
  ) {}

  /**
   * @throws ServiceUnavailableException when queues are not configured
   */
  async enqueueBackfill(): Promise<string> {
    if (!this.queue) {
      this.logger.warn(
        "BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_SERVICE :: enqueueBackfill :: queue disabled"
      );
      throw new ServiceUnavailableException(
        "Background queues are disabled. Set ENABLE_QUEUES=true and Redis to run this backfill."
      );
    }

    const job = await this.queue.add(
      BACKFILL_CREDIT_IMPORT_ALLOCATION_JOB_NAME,
      {},
      {
        ...BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_CONFIG.defaultJobOptions,
        jobId: `credit-import-allocation-backfill-${String(Date.now())}`,
      }
    );

    const jobId = job.id ?? "";
    this.logger.log(
      `BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_SERVICE :: enqueueBackfill :: jobId=${jobId}`
    );
    return jobId;
  }
}
