import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { isQueuesEnabled } from "config/redis-config";
import { ResumeIndexingQueueService } from "./resume-indexing-queue.service";
import {
  RESUME_INDEXING_QUEUE_CONFIG,
  RESUME_INDEXING_QUEUE_NAME,
} from "./resume-indexing.constants";

/**
 * Producer-only, so any module can enqueue indexing without pulling in the
 * processor and its dependencies.
 */
@Module({
  imports: [
    ...(isQueuesEnabled()
      ? [
          BullModule.registerQueue({
            name: RESUME_INDEXING_QUEUE_NAME,
            defaultJobOptions: RESUME_INDEXING_QUEUE_CONFIG.defaultJobOptions,
          }),
        ]
      : []),
  ],
  providers: [ResumeIndexingQueueService],
  exports: [ResumeIndexingQueueService],
})
export class ResumeIndexingQueueModule {}
