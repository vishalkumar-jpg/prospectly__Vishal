import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  LINKEDIN_CONTACTS_QUEUE_NAME,
  LINKEDIN_CONTACTS_QUEUE_CONFIG,
} from "./constants/linkedin-contacts-queue.constants";
import { LinkedInContactsImportJobData } from "./linkedin-contacts-queue.types";

@Injectable()
export class LinkedInContactsQueueService {
  private readonly logger = new Logger(LinkedInContactsQueueService.name);

  constructor(
    @InjectQueue(LINKEDIN_CONTACTS_QUEUE_NAME)
    private readonly queue: Queue<LinkedInContactsImportJobData>
  ) {}

  async queueImportJob(
    userId: string,
    importRecordId: string,
    s3Key: string
  ): Promise<string> {
    const job = await this.queue.add(
      "import-linkedin-contacts",
      {
        userId,
        importRecordId,
        s3Key,
      },
      LINKEDIN_CONTACTS_QUEUE_CONFIG.defaultJobOptions
    );

    return job.id || "";
  }

  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const { progress } = job;
    const returnValue = job.returnvalue;

    return {
      id: job.id,
      name: job.name,
      state,
      progress,
      returnValue,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    };
  }
}
