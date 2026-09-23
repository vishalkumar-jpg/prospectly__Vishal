import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { StripeModule } from "modules/stripe/stripe.module";
import { CalendarModule } from "modules/calendar/calendar.module";
import { EmailsModule } from "modules/emails/emails.module";
import { UserConfigurationsModule } from "modules/user-configurations/user-configurations.module";
import { CandidateWorkflowController } from "./candidate-workflow.controller";
import {
  CandidateWorkflowRejectService,
  CandidateWorkflowShortlistService,
  CandidateWorkflowInterviewInviteService,
  CandidateWorkflowHireService,
  CandidateWorkflowClassificationService,
  CandidateWorkflowReinstateService,
} from "./services";
import { RecruitmentPayoutQueueModule } from "../payout-queue/recruitment-payout-queue.module";
import { RecruitmentPayoutModule } from "../payout/recruitment-payout.module";
import { InterviewBookingModule } from "../interview-booking/interview-booking.module";
import { RecruitmentNotificationsModule } from "../notifications/recruitment-notifications.module";
import { RecruitmentCollaborationModule } from "../collaboration/recruitment-collaboration.module";
import { RecruitmentEmailLogsModule } from "../email-logs/recruitment-email-logs.module";

@Module({
  imports: [
    RecruitmentCollaborationModule,
    RecruitmentEmailLogsModule,
    StripeModule,
    CalendarModule,
    EmailsModule,
    ConfigModule,
    RecruitmentPayoutQueueModule,
    RecruitmentPayoutModule,
    InterviewBookingModule,
    UserConfigurationsModule,
    RecruitmentNotificationsModule,
  ],
  controllers: [CandidateWorkflowController],
  providers: [
    CandidateWorkflowRejectService,
    CandidateWorkflowShortlistService,
    CandidateWorkflowInterviewInviteService,
    CandidateWorkflowHireService,
    CandidateWorkflowClassificationService,
    CandidateWorkflowReinstateService,
  ],
})
export class CandidateWorkflowModule {}
