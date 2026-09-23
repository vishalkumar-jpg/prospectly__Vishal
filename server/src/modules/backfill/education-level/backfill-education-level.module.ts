import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { isQueuesEnabled } from "config/redis-config";
import {
  BACKFILL_EDUCATION_LEVEL_QUEUE_CONFIG,
  BACKFILL_EDUCATION_LEVEL_QUEUE_NAME,
} from "./backfill-education-level.constants";
import { BackfillEducationLevelQueueProcessor } from "./backfill-education-level-queue.processor";
import { BackfillEducationLevelQueueService } from "./services/backfill-education-level-queue.service";
import { BackfillEducationLevelService } from "./services/backfill-education-level.service";

const isRedisConfigured = isQueuesEnabled();

/** Only the queue service is exported, so callers cannot bypass the queue. */
@Module({
  imports: isRedisConfigured
    ? [
        BullModule.registerQueue({
          name: BACKFILL_EDUCATION_LEVEL_QUEUE_NAME,
          defaultJobOptions:
            BACKFILL_EDUCATION_LEVEL_QUEUE_CONFIG.defaultJobOptions,
        }),
      ]
    : [],
  providers: [
    BackfillEducationLevelService,
    BackfillEducationLevelQueueService,
    ...(isRedisConfigured ? [BackfillEducationLevelQueueProcessor] : []),
  ],
  exports: [BackfillEducationLevelQueueService],
})
export class BackfillEducationLevelModule {}
