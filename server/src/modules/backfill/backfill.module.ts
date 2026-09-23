import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { isQueuesEnabled } from "config/redis-config";
import { CreditsModule } from "modules/credits/credits.module";
import { ResumeIndexingQueueModule } from "modules/recruitment/resume-indexing/resume-indexing-queue.module";
import { BackfillController } from "./backfill.controller";
import {
  BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_NAME,
  BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_CONFIG,
} from "./backfill-credit-import-allocation-queue.constants";
import { BackfillCreditImportAllocationRunnerService } from "./services/backfill-credit-import-allocation-runner.service";
import { BackfillCreditImportAllocationQueueService } from "./services/backfill-credit-import-allocation-queue.service";
import { BackfillCreditImportAllocationQueueProcessor } from "./backfill-credit-import-allocation-queue.processor";
import { BackfillScoreBreakdownModule } from "./score-breakdown/backfill-score-breakdown.module";
import { BackfillEducationLevelModule } from "./education-level/backfill-education-level.module";

const isRedisConfigured = isQueuesEnabled();

@Module({
  imports: [
    CreditsModule,
    BackfillScoreBreakdownModule,
    BackfillEducationLevelModule,
    ResumeIndexingQueueModule,
    ...(isRedisConfigured
      ? [
          BullModule.registerQueue({
            name: BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_NAME,
            defaultJobOptions:
              BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_CONFIG.defaultJobOptions,
          }),
        ]
      : []),
  ],
  controllers: [BackfillController],
  providers: [
    BackfillCreditImportAllocationRunnerService,
    BackfillCreditImportAllocationQueueService,
    ...(isRedisConfigured
      ? [BackfillCreditImportAllocationQueueProcessor]
      : []),
  ],
})
export class BackfillModule {}
