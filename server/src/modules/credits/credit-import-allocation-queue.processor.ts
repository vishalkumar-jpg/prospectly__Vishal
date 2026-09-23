import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import type { CreditImportAllocationJobData } from "./credit-import-allocation-queue.types";
import { CREDIT_IMPORT_ALLOCATION_QUEUE_NAME } from "./credit-import-allocation-queue.constants";
import { CreditImportAllocationService } from "./credit-import-allocation.service";

@Processor(CREDIT_IMPORT_ALLOCATION_QUEUE_NAME)
export class CreditImportAllocationQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(
    CreditImportAllocationQueueProcessor.name
  );

  constructor(
    @Inject(CreditImportAllocationService)
    private readonly creditImportAllocationService: CreditImportAllocationService
  ) {
    super();
  }

  async process(job: Job<CreditImportAllocationJobData>): Promise<void> {
    const { contactsImportId } = job.data;
    this.logger.log(
      `CREDIT_IMPORT_ALLOCATION_QUEUE_PROCESSOR :: process :: jobId=${String(job.id)} contactsImportId=${contactsImportId}`
    );
    try {
      await this.creditImportAllocationService.processCompletedImport(
        contactsImportId
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `CREDIT_IMPORT_ALLOCATION_QUEUE_PROCESSOR :: process : ERROR : ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<CreditImportAllocationJobData>) {
    const { contactsImportId } = job.data;
    this.logger.log(
      `CREDIT_IMPORT_ALLOCATION_QUEUE_PROCESSOR :: completed :: jobId=${String(job.id)} contactsImportId=${contactsImportId}`
    );
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<CreditImportAllocationJobData> | undefined, error: Error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(
      `CREDIT_IMPORT_ALLOCATION_QUEUE_PROCESSOR :: onFailed : ERROR : ${errorMessage}`,
      error instanceof Error ? error.stack : undefined
    );
  }

  @OnWorkerEvent("stalled")
  onStalled(jobId: string) {
    this.logger.warn(
      `CREDIT_IMPORT_ALLOCATION_QUEUE_PROCESSOR :: stalled :: jobId=${jobId}`
    );
  }
}
