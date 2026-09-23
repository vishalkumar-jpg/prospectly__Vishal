import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { isQueuesEnabled } from "config/redis-config";
import {
  TYPESENSE_SYNC_QUEUE_NAME,
  TYPESENSE_SYNC_QUEUE_CONFIG,
} from "./constants/typesense-sync-queue.constants";
import { TypesenseSyncQueueService } from "./typesense-sync-queue.service";

const isRedisConfigured = isQueuesEnabled();

@Module({
  imports: [
    ...(isRedisConfigured
      ? [
          BullModule.registerQueue({
            name: TYPESENSE_SYNC_QUEUE_NAME,
            defaultJobOptions: TYPESENSE_SYNC_QUEUE_CONFIG.defaultJobOptions,
          }),
        ]
      : []),
  ],
  providers: [...(isRedisConfigured ? [TypesenseSyncQueueService] : [])],
  exports: [...(isRedisConfigured ? [TypesenseSyncQueueService] : [])],
})
export class TypesenseSyncQueueModule {}
