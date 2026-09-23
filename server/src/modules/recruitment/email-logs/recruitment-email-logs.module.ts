import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "database/database.module";
import { RecruitmentEmailLogsService } from "./recruitment-email-logs.service";
import { RecruitmentEmailLogPersistQueueService } from "./recruitment-email-log-persist-queue.service";
import { RecruitmentEmailLogPersistService } from "./recruitment-email-log-persist.service";
import {
  RECRUITMENT_EMAIL_LOG_PERSIST_QUEUE_CONFIG,
  RECRUITMENT_EMAIL_LOG_PERSIST_QUEUE_NAME,
} from "./recruitment-email-logs.constants";

/**
 * Core email-logs module: persistence only (database + persist queue).
 *
 * Loaded by both the API and the worker process, so it must stay free of
 * request-scoped/authorization dependencies. HTTP surface and access-checked
 * read/resend services live in RecruitmentEmailLogsApiModule.
 */
@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: RECRUITMENT_EMAIL_LOG_PERSIST_QUEUE_NAME,
      defaultJobOptions:
        RECRUITMENT_EMAIL_LOG_PERSIST_QUEUE_CONFIG.defaultJobOptions,
    }),
  ],
  providers: [
    RecruitmentEmailLogsService,
    RecruitmentEmailLogPersistQueueService,
    RecruitmentEmailLogPersistService,
  ],
  exports: [RecruitmentEmailLogsService, RecruitmentEmailLogPersistService],
})
export class RecruitmentEmailLogsModule {}
