import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import type { BackfillScoreBreakdownJobData } from "./backfill-score-breakdown-queue.types";
import { BACKFILL_SCORE_BREAKDOWN_QUEUE_NAME } from "./backfill-score-breakdown-queue.constants";
import { BackfillScoreBreakdownRunnerService } from "./services/backfill-score-breakdown-runner.service";

@Processor(BACKFILL_SCORE_BREAKDOWN_QUEUE_NAME)
export class BackfillScoreBreakdownQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(
    BackfillScoreBreakdownQueueProcessor.name
  );

  constructor(
    @Inject(BackfillScoreBreakdownRunnerService)
    private readonly backfillRunner: BackfillScoreBreakdownRunnerService
  ) {
    super();
  }

  async process(job: Job<BackfillScoreBreakdownJobData>): Promise<void> {
    const { jobIds, force } = job.data;
    this.logger.log(
      `BACKFILL_SCORE_BREAKDOWN_QUEUE_PROCESSOR :: process :: jobId=${String(job.id)} jobIds=${String(jobIds.length)} force=${String(force)}`
    );
    try {
      const summary = await this.backfillRunner.runBackfill(jobIds, force);
      this.logger.log(
        `BACKFILL_SCORE_BREAKDOWN_QUEUE_PROCESSOR :: process :: jobId=${String(job.id)} summary=${JSON.stringify(summary)}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `BACKFILL_SCORE_BREAKDOWN_QUEUE_PROCESSOR :: process : ERROR : ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<BackfillScoreBreakdownJobData>) {
    this.logger.log(
      `BACKFILL_SCORE_BREAKDOWN_QUEUE_PROCESSOR :: completed :: jobId=${String(job.id)}`
    );
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<BackfillScoreBreakdownJobData> | undefined, error: Error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(
      `BACKFILL_SCORE_BREAKDOWN_QUEUE_PROCESSOR :: onFailed : ERROR : ${errorMessage}`,
      error instanceof Error ? error.stack : undefined
    );
  }

  @OnWorkerEvent("stalled")
  onStalled(jobId: string) {
    this.logger.warn(
      `BACKFILL_SCORE_BREAKDOWN_QUEUE_PROCESSOR :: stalled :: jobId=${jobId}`
    );
  }
}
