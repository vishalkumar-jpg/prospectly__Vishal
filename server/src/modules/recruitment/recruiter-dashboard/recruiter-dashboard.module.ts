import { Module } from "@nestjs/common";
import { RecruiterDashboardController } from "./recruiter-dashboard.controller";
import { DashboardSummaryService } from "./services/dashboard-summary.service";
import { DashboardPriorityActionsService } from "./services/dashboard-priority-actions.service";
import { DashboardActiveJobsService } from "./services/dashboard-active-jobs.service";
import { DashboardRecentActivityService } from "./services/dashboard-recent-activity.service";
import { DashboardHiringOverviewService } from "./services/dashboard-hiring-overview.service";
import { DashboardCandidateFunnelService } from "./services/dashboard-candidate-funnel.service";
import { DashboardPayoutsDueService } from "./services/dashboard-payouts-due.service";
import { RecruitmentFeeConfigModule } from "../fee-config/recruitment-fee-config.module";

@Module({
  imports: [RecruitmentFeeConfigModule],
  controllers: [RecruiterDashboardController],
  providers: [
    DashboardSummaryService,
    DashboardPriorityActionsService,
    DashboardActiveJobsService,
    DashboardRecentActivityService,
    DashboardHiringOverviewService,
    DashboardCandidateFunnelService,
    DashboardPayoutsDueService,
  ],
})
export class RecruiterDashboardModule {}
