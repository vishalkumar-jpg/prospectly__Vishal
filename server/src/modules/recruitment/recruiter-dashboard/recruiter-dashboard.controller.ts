import { Controller, Get, Logger, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { RequireModule } from "decorators/require-module.decorator";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import {
  RecruiterDashboardCountriesQueryDto,
  RecruiterDashboardPeriodQueryDto,
} from "./recruiter-dashboard.dto";
import { DashboardSummaryService } from "./services/dashboard-summary.service";
import { DashboardHiringOverviewService } from "./services/dashboard-hiring-overview.service";
import { DashboardCandidateFunnelService } from "./services/dashboard-candidate-funnel.service";
import { DashboardPayoutsDueService } from "./services/dashboard-payouts-due.service";
import { DEFAULT_DASHBOARD_PERIOD } from "./recruiter-dashboard.constants";

@RequireModule("recruiting")
@Controller("recruiter/dashboard")
export class RecruiterDashboardController {
  private readonly logger = new Logger(RecruiterDashboardController.name);

  constructor(
    private readonly summaryService: DashboardSummaryService,
    private readonly hiringOverviewService: DashboardHiringOverviewService,
    private readonly candidateFunnelService: DashboardCandidateFunnelService,
    private readonly payoutsDueService: DashboardPayoutsDueService
  ) {}

  @Get("payouts-due")
  async getPayoutsDue(
    @CurrentUser("userId") userId: string,
    @Query() query: RecruiterDashboardCountriesQueryDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.payoutsDueService.getPayoutsDue(
        userId,
        query.countries ?? []
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITER_DASHBOARD_CONTROLLER :: GET_PAYOUTS_DUE :: ERROR :: ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Get("summary")
  async getSummary(
    @CurrentUser("userId") userId: string,
    @Query() query: RecruiterDashboardCountriesQueryDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.summaryService.getSummary(
        userId,
        query.countries ?? []
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITER_DASHBOARD_CONTROLLER :: GET_SUMMARY :: ERROR :: ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Get("hiring-overview")
  async getHiringOverview(
    @CurrentUser("userId") userId: string,
    @Query() query: RecruiterDashboardPeriodQueryDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.hiringOverviewService.getHiringOverview(
        userId,
        query.countries ?? [],
        query.period ?? DEFAULT_DASHBOARD_PERIOD
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITER_DASHBOARD_CONTROLLER :: GET_HIRING_OVERVIEW :: ERROR :: ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Get("candidate-funnel")
  async getCandidateFunnel(
    @CurrentUser("userId") userId: string,
    @Query() query: RecruiterDashboardPeriodQueryDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.candidateFunnelService.getCandidateFunnel(
        userId,
        query.countries ?? [],
        query.period ?? DEFAULT_DASHBOARD_PERIOD
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITER_DASHBOARD_CONTROLLER :: GET_CANDIDATE_FUNNEL :: ERROR :: ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
