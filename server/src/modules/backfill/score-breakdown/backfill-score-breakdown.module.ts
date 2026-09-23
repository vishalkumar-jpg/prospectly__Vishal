import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { isQueuesEnabled } from "config/redis-config";
import { JobExtractionModule } from "modules/recruitment/job-extraction/job-extraction.module";
import {
  BACKFILL_SCORE_BREAKDOWN_QUEUE_NAME,
  BACKFILL_SCORE_BREAKDOWN_QUEUE_CONFIG,
} from "./backfill-score-breakdown-queue.constants";
import { BackfillScoreBreakdownQueueProcessor } from "./backfill-score-breakdown-queue.processor";
import { BackfillScoreBreakdownQueueService } from "./services/backfill-score-breakdown-queue.service";
import { BackfillScoreBreakdownRunnerService } from "./services/backfill-score-breakdown-runner.service";
import { BackfillScoreBreakdownAiService } from "./services/backfill-score-breakdown-ai.service";
import { BackfillScoreBreakdownRepository } from "./services/backfill-score-breakdown.repository";

const isRedisConfigured = isQueuesEnabled();

/**
 * Only the queue service is exported — the runner, AI service and repository
 * stay private so callers cannot bypass the queue.
 */
@Module({
  imports: [
    JobExtractionModule,
    ...(isRedisConfigured
      ? [
          BullModule.registerQueue({
            name: BACKFILL_SCORE_BREAKDOWN_QUEUE_NAME,
            defaultJobOptions:
              BACKFILL_SCORE_BREAKDOWN_QUEUE_CONFIG.defaultJobOptions,
          }),
        ]
      : []),
  ],
  providers: [
    BackfillScoreBreakdownRepository,
    BackfillScoreBreakdownAiService,
    BackfillScoreBreakdownRunnerService,
    BackfillScoreBreakdownQueueService,
    ...(isRedisConfigured ? [BackfillScoreBreakdownQueueProcessor] : []),
  ],
  exports: [BackfillScoreBreakdownQueueService],
})
export class BackfillScoreBreakdownModule {}
