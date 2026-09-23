import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  GOOGLE_CONTACTS_QUEUE_NAME,
  GOOGLE_CONTACTS_QUEUE_CONFIG,
} from "./constants/google-contacts-queue.constants";
import { GoogleContactsImportJobData } from "./google-contacts-queue.types";

@Injectable()
export class GoogleContactsQueueService {
  private readonly logger = new Logger(GoogleContactsQueueService.name);

  constructor(
    @InjectQueue(GOOGLE_CONTACTS_QUEUE_NAME)
    private readonly queue: Queue<GoogleContactsImportJobData>
  ) {}

  async queueImportJob(userId: string, integrationId: string): Promise<string> {
    this.logger.log(
      `Queueing Google Contacts import job for user ${userId}, integration ${integrationId}`
    );

    const job = await this.queue.add(
      "import-google-contacts",
      {
        userId,
        integrationId,
      },
      GOOGLE_CONTACTS_QUEUE_CONFIG.defaultJobOptions
    );

    this.logger.log(`Google Contacts import job queued with ID: ${job.id}`);

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
