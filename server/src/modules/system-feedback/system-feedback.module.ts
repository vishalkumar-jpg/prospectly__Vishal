import { Module } from "@nestjs/common";
import { SharedModule } from "shared/shared.module";
import { MediaModule } from "modules/media/media.module";
import { EmailsModule } from "modules/emails/emails.module";
import { SystemConfigurationModule } from "modules/system-configuration/system-configuration.module";
import { SystemFeedbackController } from "./system-feedback.controller";
import { SystemFeedbackService } from "./system-feedback.service";
import { SystemFeedbackNotificationService } from "./system-feedback-notification.service";

@Module({
  imports: [SharedModule, MediaModule, EmailsModule, SystemConfigurationModule],
  controllers: [SystemFeedbackController],
  providers: [SystemFeedbackService, SystemFeedbackNotificationService],
  exports: [SystemFeedbackService],
})
export class SystemFeedbackModule {}
