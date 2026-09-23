import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import type { CreateRecruitmentEmailLogInput } from "./recruitment-email-logs.service";
import {
  RECRUITMENT_EMAIL_LOG_PERSIST_JOB,
  RECRUITMENT_EMAIL_LOG_PERSIST_QUEUE_NAME,
} from "./recruitment-email-logs.constants";

@Injectable()
export class RecruitmentEmailLogPersistQueueService {
  private readonly logger = new Logger(
    RecruitmentEmailLogPersistQueueService.name
  );

  constructor(
    @InjectQueue(RECRUITMENT_EMAIL_LOG_PERSIST_QUEUE_NAME)
    private readonly queue: Queue<CreateRecruitmentEmailLogInput>
  ) {}

  async enqueue(row: CreateRecruitmentEmailLogInput): Promise<void> {
    const jobId = `persist-${row.providerId}`;
    const existing = await this.queue.getJob(jobId);

    if (existing) {
      const state = await existing.getState();
      if (state === "failed") {
        await existing.retry("failed");
        this.logger.warn(
          `RECRUITMENT_EMAIL_LOG_PERSIST_QUEUE :: ENQUEUE :: RETRY_FAILED :: providerId=${row.providerId}`
        );
        return;
      }
      if (state === "completed") {
        return;
      }
      this.logger.warn(
        `RECRUITMENT_EMAIL_LOG_PERSIST_QUEUE :: ENQUEUE :: JOB_ALREADY_${state.toUpperCase()} :: providerId=${row.providerId}`
      );
      return;
    }

    await this.queue.add(RECRUITMENT_EMAIL_LOG_PERSIST_JOB, row, { jobId });
  }
}
