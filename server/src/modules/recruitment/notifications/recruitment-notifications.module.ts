import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "database/database.module";
import { EmailsModule } from "modules/emails/emails.module";
import { ContactsModule } from "modules/contacts/contacts.module";
import { CreditsModule } from "modules/credits/credits.module";
import { RecruitmentEmailLogsModule } from "modules/recruitment/email-logs/recruitment-email-logs.module";
import { RecruitmentNotificationsController } from "./recruitment-notifications.controller";
import {
  RecruitmentNotificationsQueryService,
  RecruitmentNotificationsDispatchService,
} from "./services";
import { RecruitmentLifecycleNotificationDispatchService } from "./services/recruitment-lifecycle-notification-dispatch.service";
import { RecruitmentNotificationQueueService } from "./recruitment-notification-queue.service";
import {
  RECRUITMENT_NOTIFICATION_QUEUE_NAME,
  RECRUITMENT_NOTIFICATION_QUEUE_CONFIG,
} from "./recruitment-notifications.constants";

@Module({
  imports: [
    DatabaseModule,
    EmailsModule,
    ContactsModule,
    CreditsModule,
    forwardRef(() => RecruitmentEmailLogsModule),
    ConfigModule,
    BullModule.registerQueue({
      name: RECRUITMENT_NOTIFICATION_QUEUE_NAME,
      defaultJobOptions:
        RECRUITMENT_NOTIFICATION_QUEUE_CONFIG.defaultJobOptions,
    }),
  ],
  controllers: [RecruitmentNotificationsController],
  providers: [
    RecruitmentNotificationsQueryService,
    RecruitmentNotificationsDispatchService,
    RecruitmentLifecycleNotificationDispatchService,
    RecruitmentNotificationQueueService,
  ],
  exports: [
    RecruitmentNotificationsDispatchService,
    RecruitmentLifecycleNotificationDispatchService,
    RecruitmentNotificationQueueService,
    RecruitmentEmailLogsModule,
  ],
})
export class RecruitmentNotificationsModule {}
