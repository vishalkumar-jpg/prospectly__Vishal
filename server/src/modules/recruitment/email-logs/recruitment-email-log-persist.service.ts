import { Injectable, Logger } from "@nestjs/common";
import {
  RECRUITMENT_EMAIL_LOG_PERSIST_INLINE_RETRIES,
  RECRUITMENT_EMAIL_LOG_PERSIST_INLINE_RETRY_DELAY_MS,
} from "./recruitment-email-logs.constants";
import { RecruitmentEmailLogPersistQueueService } from "./recruitment-email-log-persist-queue.service";
import {
  RecruitmentEmailLogsService,
  type CreateRecruitmentEmailLogInput,
} from "./recruitment-email-logs.service";

@Injectable()
export class RecruitmentEmailLogPersistService {
  private readonly logger = new Logger(RecruitmentEmailLogPersistService.name);

  constructor(
    private readonly emailLogsService: RecruitmentEmailLogsService,
    private readonly persistQueueService: RecruitmentEmailLogPersistQueueService
  ) {}

  async persistWithRecovery(
    row: CreateRecruitmentEmailLogInput
  ): Promise<void> {
    if (await this.emailLogsService.findByProviderId(row.providerId)) {
      return;
    }

    let lastError: unknown;
    for (
      let attempt = 1;
      attempt <= RECRUITMENT_EMAIL_LOG_PERSIST_INLINE_RETRIES;
      attempt++
    ) {
      try {
        await this.emailLogsService.createOne(row);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < RECRUITMENT_EMAIL_LOG_PERSIST_INLINE_RETRIES) {
          await this.delay(
            RECRUITMENT_EMAIL_LOG_PERSIST_INLINE_RETRY_DELAY_MS * attempt
          );
        }
      }
    }

    this.logger.error(
      `RECRUITMENT_EMAIL_LOG_PERSIST :: PERSIST_WITH_RECOVERY : ERROR : providerId=${row.providerId}; ${String(lastError)}`
    );

    await this.persistQueueService.enqueue(row);
    this.logger.warn(
      `RECRUITMENT_EMAIL_LOG_PERSIST :: PERSIST_WITH_RECOVERY :: QUEUED :: providerId=${row.providerId}`
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
