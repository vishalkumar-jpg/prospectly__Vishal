import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CalendarModule } from "modules/calendar/calendar.module";
import { ContactsModule } from "modules/contacts/contacts.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { PaymentsModule } from "modules/payments/payments.module";
import { EmailsModule } from "modules/emails/emails.module";
import { BountyStagesModule } from "modules/bounty-stages/bounty-stages.module";
import { PayoutQueueModule } from "modules/payout-queue";
import { TrustScoreQueueModule } from "modules/trust-score-queue/trust-score-queue.module";
import { FinancesModule } from "modules/finances/finances.module";
import { MarketplacePayoutModule } from "modules/global-marketplace/payout";
import { MeetingService } from "./meeting.service";
import { MeetingCompletionService } from "./meeting-completion.service";
import { RescheduleMeetingService } from "./reschedule-meeting.service";
import { MeetingController } from "./meeting.controller";
import { PayoutRecordHelper, PayoutProcessorHelper } from "./payout-helper";
import { IntroductionsModule } from "../introductions.module";

@Module({
  imports: [
    ConfigModule,
    CalendarModule,
    ContactsModule,
    ProfilesModule,
    PaymentsModule,
    EmailsModule,
    BountyStagesModule,
    PayoutQueueModule,
    TrustScoreQueueModule,
    FinancesModule,
    forwardRef(() => MarketplacePayoutModule),
    forwardRef(() => IntroductionsModule),
  ],
  controllers: [MeetingController],
  providers: [
    MeetingService,
    MeetingCompletionService,
    RescheduleMeetingService,
    PayoutRecordHelper,
    PayoutProcessorHelper,
  ],
  exports: [MeetingService, MeetingCompletionService, RescheduleMeetingService],
})
export class MeetingModule {}
