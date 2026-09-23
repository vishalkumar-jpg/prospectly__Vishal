import { Global, Module } from "@nestjs/common";
import { BountyStagesModule } from "modules/bounty-stages/bounty-stages.module";
import { IntroductionsModule } from "modules/introductions/introductions.module";
import { IntroductionNotificationsModule } from "modules/introductions/notifications/introduction-notifications.module";
import { CalendarModule } from "modules/calendar/calendar.module";
import { ContactQueueModule } from "modules/contact-queue/contact-queue.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { TrustScoreQueueModule } from "modules/trust-score-queue/trust-score-queue.module";
import { UserConfigurationsModule } from "modules/user-configurations/user-configurations.module";
import { AccountDeletionModule } from "modules/account-deletion/account-deletion.module";
import { EmailsModule } from "modules/emails/emails.module";
import { ContactsModule } from "modules/contacts/contacts.module";
import { RecruitmentEmailLogsModule } from "modules/recruitment/email-logs/recruitment-email-logs.module";
import { ResumeIndexingModule } from "modules/recruitment/resume-indexing/resume-indexing.module";
import { SystemConfigurationModule } from "modules/system-configuration/system-configuration.module";
import { AccountDeletionCronService } from "modules/account-deletion/account-deletion-cron.service";
import { RefreshTokenService } from "services/refreshTokenService";
import { MeetingsCronService } from "./meetings/mettings-cron.service";
import { MicrosoftMeetingsProcessorService } from "./meetings/microsoft/microsoft-meetings-processor.service";
import { MicrosoftMeetingsEmailService } from "./meetings/microsoft/microsoft-meetings-email.service";
import { MicrosoftMeetingsEmailFetchService } from "./meetings/microsoft/microsoft-meetings-email-fetch.service";
import { MicrosoftMeetingsTokenService } from "./meetings/microsoft/microsoft-meetings-token.service";
import { MicrosoftMeetingsOnlineApiService } from "./meetings/microsoft/microsoft-meetings-online-api.service";
import { MicrosoftMeetingsCalendarService } from "./meetings/microsoft/microsoft-meetings-calendar.service";
import { MicrosoftMeetingsAccountHandlerService } from "./meetings/microsoft/microsoft-meetings-account-handler.service";
import { CalendarTokenCronService } from "./calendar/calendar-token-cron.service";
import { ContactsTokenCronService } from "./contacts/contacts-token-cron.service";
import { TrustScoreCronService } from "./trust-score/trust-score-cron.service";
import { NoResponseHandlerService } from "./trust-score/no-response-handler.service";
import { HighSuccessRateHandlerService } from "./trust-score/high-success-rate-handler.service";
import { InReviewReminderCronService } from "./recruitment/in-review-reminder-cron.service";
import { ResumeFacetRollupCronService } from "./recruitment/resume-facet-rollup-cron.service";
import { CronService } from "./cron.service";

@Global()
@Module({
  imports: [
    BountyStagesModule,
    IntroductionsModule,
    IntroductionNotificationsModule,
    CalendarModule,
    ContactQueueModule,
    TrustScoreQueueModule,
    UserConfigurationsModule,
    ProfilesModule,
    AccountDeletionModule,
    EmailsModule,
    ContactsModule,
    RecruitmentEmailLogsModule,
    SystemConfigurationModule,
    ResumeIndexingModule,
  ],
  providers: [
    CronService,
    InReviewReminderCronService,
    ResumeFacetRollupCronService,
    AccountDeletionCronService,
    MeetingsCronService,
    MicrosoftMeetingsProcessorService,
    MicrosoftMeetingsEmailService,
    MicrosoftMeetingsEmailFetchService,
    MicrosoftMeetingsTokenService,
    MicrosoftMeetingsOnlineApiService,
    MicrosoftMeetingsCalendarService,
    MicrosoftMeetingsAccountHandlerService,
    TrustScoreCronService,
    NoResponseHandlerService,
    HighSuccessRateHandlerService,
    CalendarTokenCronService,
    ContactsTokenCronService,
    RefreshTokenService,
  ],
  exports: [
    TrustScoreCronService,
    NoResponseHandlerService,
    HighSuccessRateHandlerService,
    MeetingsCronService,
    CalendarTokenCronService,
    ContactsTokenCronService,
  ],
})
export class CronModule {}
