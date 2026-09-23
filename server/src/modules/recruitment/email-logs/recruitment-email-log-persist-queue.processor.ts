import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import {
  RECRUITMENT_EMAIL_LOG_PERSIST_JOB,
  RECRUITMENT_EMAIL_LOG_PERSIST_QUEUE_NAME,
} from "./recruitment-email-logs.constants";
import {
  RecruitmentEmailLogsService,
  type CreateRecruitmentEmailLogInput,
} from "./recruitment-email-logs.service";

@Processor(RECRUITMENT_EMAIL_LOG_PERSIST_QUEUE_NAME)
export class RecruitmentEmailLogPersistQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(
    RecruitmentEmailLogPersistQueueProcessor.name
  );

  constructor(private readonly emailLogsService: RecruitmentEmailLogsService) {
    super();
  }

  async process(job: Job<CreateRecruitmentEmailLogInput>): Promise<void> {
    if (job.name !== RECRUITMENT_EMAIL_LOG_PERSIST_JOB) {
      this.logger.warn(
        `RECRUITMENT_EMAIL_LOG_PERSIST_PROCESSOR :: UNKNOWN_JOB :: ${job.name}`
      );
      return;
    }

    const row = job.data;
    if (await this.emailLogsService.findByProviderId(row.providerId)) {
      return;
    }

    await this.emailLogsService.createOne(row);
    this.logger.log(
      `RECRUITMENT_EMAIL_LOG_PERSIST_PROCESSOR :: PERSISTED :: providerId=${row.providerId}`
    );
  }
}
