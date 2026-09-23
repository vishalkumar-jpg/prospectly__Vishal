import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import type { BackfillCreditImportAllocationJobData } from "./backfill-credit-import-allocation-queue.types";
import { BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_NAME } from "./backfill-credit-import-allocation-queue.constants";
import { BackfillCreditImportAllocationRunnerService } from "./services/backfill-credit-import-allocation-runner.service";

@Processor(BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_NAME)
export class BackfillCreditImportAllocationQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(
    BackfillCreditImportAllocationQueueProcessor.name
  );

  constructor(
    @Inject(BackfillCreditImportAllocationRunnerService)
    private readonly backfillRunner: BackfillCreditImportAllocationRunnerService
  ) {
    super();
  }

  async process(
    job: Job<BackfillCreditImportAllocationJobData>
  ): Promise<void> {
    this.logger.log(
      `BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_PROCESSOR :: process :: jobId=${String(job.id)}`
    );
    try {
      const summary = await this.backfillRunner.runBackfill();
      this.logger.log(
        `BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_PROCESSOR :: process :: jobId=${String(job.id)} summary=${JSON.stringify(summary)}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_PROCESSOR :: process : ERROR : ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<BackfillCreditImportAllocationJobData>) {
    this.logger.log(
      `BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_PROCESSOR :: completed :: jobId=${String(job.id)}`
    );
  }

  @OnWorkerEvent("failed")
  onFailed(
    job: Job<BackfillCreditImportAllocationJobData> | undefined,
    error: Error
  ) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(
      `BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_PROCESSOR :: onFailed : ERROR : ${errorMessage}`,
      error instanceof Error ? error.stack : undefined
    );
  }

  @OnWorkerEvent("stalled")
  onStalled(jobId: string) {
    this.logger.warn(
      `BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_PROCESSOR :: stalled :: jobId=${jobId}`
    );
  }
}
