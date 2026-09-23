import { Module } from "@nestjs/common";
import { CalendarModule } from "modules/calendar/calendar.module";
import { StripeModule } from "modules/stripe/stripe.module";
import { UserConfigurationsModule } from "modules/user-configurations/user-configurations.module";
import { InterviewBookingController } from "./interview-booking.controller";
import {
  InterviewBookingAvailabilityService,
  InterviewBookingConfirmService,
  InterviewBookingSuccessFeePaymentService,
  InterviewBookingFlatChargeService,
} from "./services";
import { RecruitmentNotificationsModule } from "../notifications/recruitment-notifications.module";
import { RecruitmentPayoutModule } from "../payout/recruitment-payout.module";

@Module({
  imports: [
    CalendarModule,
    StripeModule,
    RecruitmentPayoutModule,
    RecruitmentNotificationsModule,
    UserConfigurationsModule,
  ],
  controllers: [InterviewBookingController],
  providers: [
    InterviewBookingAvailabilityService,
    InterviewBookingConfirmService,
    InterviewBookingSuccessFeePaymentService,
    InterviewBookingFlatChargeService,
  ],
  // Reused by the hire flow: the referral fee + success fee are charged at
  // "Move to Hired", not at booking.
  exports: [
    InterviewBookingFlatChargeService,
    InterviewBookingSuccessFeePaymentService,
  ],
})
export class InterviewBookingModule {}
