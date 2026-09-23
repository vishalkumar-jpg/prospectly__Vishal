import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConsentEmailSendQueueService } from "./consent-email-send-queue.service";
import {
  CONSENT_UPDATE_EMAIL_SEND_QUEUE_CONFIG,
  CONSENT_UPDATE_EMAIL_SEND_QUEUE_NAME,
} from "./consent-email-send.constants";

@Module({
  imports: [
    BullModule.registerQueue({
      name: CONSENT_UPDATE_EMAIL_SEND_QUEUE_NAME,
      defaultJobOptions:
        CONSENT_UPDATE_EMAIL_SEND_QUEUE_CONFIG.defaultJobOptions,
    }),
  ],
  providers: [ConsentEmailSendQueueService],
  exports: [ConsentEmailSendQueueService],
})
export class ConsentEmailSendQueueModule {}
