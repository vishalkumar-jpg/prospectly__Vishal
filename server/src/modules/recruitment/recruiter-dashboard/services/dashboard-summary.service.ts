import { Injectable } from "@nestjs/common";
import type { RecruiterDashboardSummaryResponse } from "../recruiter-dashboard.response";
import { DashboardPriorityActionsService } from "./dashboard-priority-actions.service";
import { DashboardActiveJobsService } from "./dashboard-active-jobs.service";
import { DashboardRecentActivityService } from "./dashboard-recent-activity.service";

@Injectable()
export class DashboardSummaryService {
  constructor(
    private readonly priorityActionsService: DashboardPriorityActionsService,
    private readonly activeJobsService: DashboardActiveJobsService,
    private readonly recentActivityService: DashboardRecentActivityService
  ) {}

  async getSummary(
    userId: string,
    countries: string[]
  ): Promise<RecruiterDashboardSummaryResponse> {
    const [priorityActions, activeJobs, recentActivity] = await Promise.all([
      this.priorityActionsService.getPriorityActions(userId, countries),
      this.activeJobsService.getActiveJobs(userId, countries),
      this.recentActivityService.getRecentActivity(userId, countries),
    ]);

    return { priorityActions, activeJobs, recentActivity };
  }
}
