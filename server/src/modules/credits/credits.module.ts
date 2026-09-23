import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { isQueuesEnabled } from "config/redis-config";
import { CreditsController } from "./credits.controller";
import { CreditsService } from "./credits.service";
import { CreditBalanceHelper } from "./helpers/credit-balance.helper";
import { CreditUsageHelper } from "./helpers/credit-usage.helper";
import { CreditImportMetricsHelper } from "./credit-import-metrics.helper";
import { CreditImportAllocationService } from "./credit-import-allocation.service";
import { CreditImportAllocationQueueService } from "./credit-import-allocation-queue.service";
import { CreditImportAllocationQueueProcessor } from "./credit-import-allocation-queue.processor";
import {
  CREDIT_IMPORT_ALLOCATION_QUEUE_NAME,
  CREDIT_IMPORT_ALLOCATION_QUEUE_CONFIG,
} from "./credit-import-allocation-queue.constants";

const isRedisConfigured = isQueuesEnabled();

@Module({
  imports: [
    ...(isRedisConfigured
      ? [
          BullModule.registerQueue({
            name: CREDIT_IMPORT_ALLOCATION_QUEUE_NAME,
            defaultJobOptions:
              CREDIT_IMPORT_ALLOCATION_QUEUE_CONFIG.defaultJobOptions,
          }),
        ]
      : []),
  ],
  controllers: [CreditsController],
  providers: [
    CreditsService,
    CreditBalanceHelper,
    CreditUsageHelper,
    CreditImportMetricsHelper,
    CreditImportAllocationService,
    ...(isRedisConfigured
      ? [
          CreditImportAllocationQueueService,
          CreditImportAllocationQueueProcessor,
        ]
      : []),
  ],
  exports: [
    CreditsService,
    CreditBalanceHelper,
    CreditUsageHelper,
    CreditImportMetricsHelper,
    CreditImportAllocationService,
    ...(isRedisConfigured ? [CreditImportAllocationQueueService] : []),
  ],
})
export class CreditsModule {}
