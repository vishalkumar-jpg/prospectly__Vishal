import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { EmailsModule } from "modules/emails/emails.module";
import {
  INTRODUCTION_NOTIFICATION_QUEUE_CONFIG,
  INTRODUCTION_NOTIFICATION_QUEUE_NAME,
} from "./introduction-notifications.constants";
import { IntroductionNotificationQueueService } from "./introduction-notification-queue.service";
import { IntroductionNotificationsDispatchService } from "./introduction-notifications-dispatch.service";

@Module({
  imports: [
    EmailsModule,
    BullModule.registerQueue({
      name: INTRODUCTION_NOTIFICATION_QUEUE_NAME,
      defaultJobOptions:
        INTRODUCTION_NOTIFICATION_QUEUE_CONFIG.defaultJobOptions,
    }),
  ],
  providers: [
    IntroductionNotificationQueueService,
    IntroductionNotificationsDispatchService,
  ],
  exports: [IntroductionNotificationsDispatchService],
})
export class IntroductionNotificationsModule {}
