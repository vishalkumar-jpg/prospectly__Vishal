import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  MICROSOFT_CONTACTS_QUEUE_NAME,
  MICROSOFT_CONTACTS_QUEUE_CONFIG,
} from "./constants/microsoft-contacts-queue.constants";
import { MicrosoftContactsImportJobData } from "./microsoft-contacts-queue.types";

@Injectable()
export class MicrosoftContactsQueueService {
  private readonly logger = new Logger(MicrosoftContactsQueueService.name);

  constructor(
    @InjectQueue(MICROSOFT_CONTACTS_QUEUE_NAME)
    private readonly queue: Queue<MicrosoftContactsImportJobData>
  ) {}

  async queueImportJob(userId: string, integrationId: string): Promise<string> {
    const job = await this.queue.add(
      "import-microsoft-contacts",
      {
        userId,
        integrationId,
      },
      MICROSOFT_CONTACTS_QUEUE_CONFIG.defaultJobOptions
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
