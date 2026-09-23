import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { isQueuesEnabled } from "config/redis-config";
import {
  ACCOUNT_DELETION_QUEUE_CONFIG,
  ACCOUNT_DELETION_QUEUE_NAME,
} from "./account-deletion-queue.constants";
import { AccountDeletionQueueService } from "./account-deletion-queue.service";

const redisOn = isQueuesEnabled();

/** Registers the queue for producers (API). Workers register {@link AccountDeletionQueueProcessor} separately. */
@Module({
  imports: [
    ...(redisOn
      ? [
          BullModule.registerQueue({
            name: ACCOUNT_DELETION_QUEUE_NAME,
            defaultJobOptions: ACCOUNT_DELETION_QUEUE_CONFIG.defaultJobOptions,
          }),
        ]
      : []),
  ],
  providers: redisOn ? [AccountDeletionQueueService] : [],
  exports: redisOn ? [AccountDeletionQueueService, BullModule] : [],
})
export class AccountDeletionQueueModule {}
