import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import crypto from "node:crypto";
import {
  CONSENT_UPDATE_EMAIL_SEND_JOB,
  CONSENT_UPDATE_EMAIL_SEND_QUEUE_NAME,
  type ConsentUpdateEmailSendJobData,
} from "./consent-email-send.constants";

@Injectable()
export class ConsentEmailSendQueueService {
  private readonly logger = new Logger(ConsentEmailSendQueueService.name);

  constructor(
    @InjectQueue(CONSENT_UPDATE_EMAIL_SEND_QUEUE_NAME)
    private readonly queue: Queue<ConsentUpdateEmailSendJobData>
  ) {}

  async enqueueConsentUpdateEmailSend(
    data: ConsentUpdateEmailSendJobData
  ): Promise<void> {
    const jobId = `consent-update-email-${data.poolMatchId}-${crypto.randomUUID()}`;
    await this.queue.add(CONSENT_UPDATE_EMAIL_SEND_JOB, data, { jobId });
    this.logger.log(
      `CONSENT_UPDATE_EMAIL_SEND_QUEUE :: ENQUEUED :: poolMatchId=${data.poolMatchId}`
    );
  }
}
