import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import type { BackfillEducationLevelJobData } from "./backfill-education-level-queue.types";
import { BACKFILL_EDUCATION_LEVEL_QUEUE_NAME } from "./backfill-education-level.constants";
import { BackfillEducationLevelService } from "./services/backfill-education-level.service";

@Processor(BACKFILL_EDUCATION_LEVEL_QUEUE_NAME)
export class BackfillEducationLevelQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(
    BackfillEducationLevelQueueProcessor.name
  );

  constructor(
    @Inject(BackfillEducationLevelService)
    private readonly backfill: BackfillEducationLevelService
  ) {
    super();
  }

  async process(job: Job<BackfillEducationLevelJobData>): Promise<void> {
    const { force } = job.data;
    this.logger.log(
      `BACKFILL_EDUCATION_LEVEL_QUEUE_PROCESSOR :: process :: jobId=${String(job.id)} force=${String(force)}`
    );
    try {
      const summary = await this.backfill.run(force);
      this.logger.log(
        `BACKFILL_EDUCATION_LEVEL_QUEUE_PROCESSOR :: process :: jobId=${String(job.id)} summary=${JSON.stringify(summary)}`
      );
    } catch (error) {
      this.logger.error(
        `BACKFILL_EDUCATION_LEVEL_QUEUE_PROCESSOR :: process : ERROR : ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }
}
