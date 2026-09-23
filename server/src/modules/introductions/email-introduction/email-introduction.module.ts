import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmailsModule } from "modules/emails/emails.module";
import { ContactsModule } from "modules/contacts/contacts.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { EmailIntroductionService } from "./email-introduction.service";
import { EmailIntroductionController } from "./email-introduction.controller";
import { IntroductionsModule } from "../introductions.module";
import { IntroductionNotificationsModule } from "../notifications/introduction-notifications.module";

@Module({
  imports: [
    ConfigModule,
    EmailsModule,
    ContactsModule,
    ProfilesModule,
    IntroductionNotificationsModule,
    forwardRef(() => IntroductionsModule),
  ],
  controllers: [EmailIntroductionController],
  providers: [EmailIntroductionService],
  exports: [EmailIntroductionService],
})
export class EmailIntroductionModule {}
