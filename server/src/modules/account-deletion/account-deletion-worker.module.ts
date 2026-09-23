import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import {
  ACCOUNT_DELETION_QUEUE_NAME,
  ACCOUNT_DELETION_QUEUE_CONFIG,
} from "./account-deletion-queue.constants";
import { AccountDeletionQueueProcessor } from "./account-deletion-queue.processor";
import { AccountDeletionModule } from "./account-deletion.module";

@Module({
  imports: [
    BullModule.registerQueue({
      name: ACCOUNT_DELETION_QUEUE_NAME,
      defaultJobOptions: ACCOUNT_DELETION_QUEUE_CONFIG.defaultJobOptions,
    }),
    forwardRef(() => AccountDeletionModule),
  ],
  providers: [AccountDeletionQueueProcessor],
  exports: [BullModule],
})
export class AccountDeletionWorkerModule {}
