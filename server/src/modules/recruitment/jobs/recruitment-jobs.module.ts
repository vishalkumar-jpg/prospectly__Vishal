import { Module } from "@nestjs/common";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { CalendarModule } from "modules/calendar/calendar.module";
import { RecruitmentJobsController } from "./recruitment-jobs.controller";
import {
  RecruitmentJobsQueryService,
  RecruitmentJobsCreateService,
  RecruitmentJobsUpdateService,
  RecruitmentJobsCloseService,
  RecruitmentJobsReopenService,
  RecruitmentJobPricingService,
} from "./services";
import { InterviewCostModule } from "../interview-cost/interview-cost.module";
import { JobPoolMatchesModule } from "../job-pool-matches/job-pool-matches.module";
import { RecruitmentNotificationsModule } from "../notifications/recruitment-notifications.module";
import { RecruitmentCollaborationModule } from "../collaboration/recruitment-collaboration.module";
import { RecruitmentPayoutModule } from "../payout/recruitment-payout.module";

@Module({
  imports: [
    RecruitmentCollaborationModule,
    ProfilesModule,
    CalendarModule,
    InterviewCostModule,
    JobPoolMatchesModule,
    RecruitmentNotificationsModule,
    RecruitmentPayoutModule,
  ],
  controllers: [RecruitmentJobsController],
  providers: [
    RecruitmentJobsQueryService,
    RecruitmentJobsCreateService,
    RecruitmentJobPricingService,
    RecruitmentJobsUpdateService,
    RecruitmentJobsCloseService,
    RecruitmentJobsReopenService,
  ],
  exports: [RecruitmentJobsQueryService],
})
export class RecruitmentJobsModule {}
