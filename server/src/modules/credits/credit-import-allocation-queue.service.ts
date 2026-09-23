import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import type { CreditImportAllocationJobData } from "./credit-import-allocation-queue.types";
import {
  CREDIT_IMPORT_ALLOCATION_QUEUE_NAME,
  CREDIT_IMPORT_ALLOCATION_QUEUE_CONFIG,
} from "./credit-import-allocation-queue.constants";

@Injectable()
export class CreditImportAllocationQueueService {
  private readonly logger = new Logger(CreditImportAllocationQueueService.name);

  constructor(
    @Optional()
    @InjectQueue(CREDIT_IMPORT_ALLOCATION_QUEUE_NAME)
    private readonly queue: Queue<CreditImportAllocationJobData> | undefined
  ) {}

  async enqueueAfterImportCompleted(contactsImportId: string): Promise<void> {
    if (!this.queue) {
      this.logger.warn(
        "CREDIT_IMPORT_ALLOCATION_QUEUE_SERVICE :: enqueueAfterImportCompleted :: queue disabled"
      );
      return;
    }

    await this.queue.add(
      "allocate-import-credits",
      { contactsImportId },
      CREDIT_IMPORT_ALLOCATION_QUEUE_CONFIG.defaultJobOptions
    );
  }
}
