import {
  Controller,
  Get,
  UseGuards,
  Inject,
  Res,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { ApiSwaggerResponse } from "modules/swagger/swagger.decorator";
import { ResponseDtoTypeEnum } from "modules/swagger/dtos/response.dtos";
import { ClassConstructor } from "class-transformer";
import type { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { DashboardService } from "./dashboard.service";
import {
  StatsResponse,
  StatsItemDto,
  PriorityActionResponse,
  HighValueOpportunityResponse,
  UpcomingMeetingsResponse,
} from "./dashboard.response";

@ApiTags(ApiTagsEnum.Dashboard)
@Controller("dashboard")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    @Inject(DashboardService)
    private readonly dashboardService: DashboardService
  ) {}

  @Get("stats")
  @ApiSwaggerResponse(StatsItemDto, {
    type: ResponseDtoTypeEnum.Array,
  })
  async getStats(@Res() res: Response, @CurrentUser("userId") userId: string) {
    try {
      const data = await this.dashboardService.getStats(userId);
      return responseUtils.success(res, {
        data,
        dto: StatsItemDto as unknown as ClassConstructor<StatsResponse>,
      });
    } catch (error) {
      this.logger.error(
        `DASHBOARD_CONTROLLER :: GET_STATS :: ERROR :: ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("priority-actions")
  @ApiSwaggerResponse(PriorityActionResponse)
  async getPriorityActions(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.dashboardService.getPriorityActions(userId);
      return responseUtils.success(res, {
        data,
        dto: PriorityActionResponse,
      });
    } catch (error) {
      this.logger.error(
        `DASHBOARD_CONTROLLER :: GET_PRIORITY_ACTIONS :: ERROR :: ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("high-value-opportunities")
  @ApiSwaggerResponse(HighValueOpportunityResponse)
  async getHighValueOpportunities(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data =
        await this.dashboardService.getHighValueOpportunities(userId);
      return responseUtils.success(res, {
        data,
        dto: HighValueOpportunityResponse,
      });
    } catch (error) {
      this.logger.error(
        `DASHBOARD_CONTROLLER :: GET_HIGH_VALUE_OPPORTUNITIES :: ERROR :: ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("upcoming-meetings")
  @ApiSwaggerResponse(UpcomingMeetingsResponse)
  async getUpcomingMeetings(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.dashboardService.getUpcomingMeetings(userId);
      return responseUtils.success(res, {
        data,
        dto: UpcomingMeetingsResponse,
      });
    } catch (error) {
      this.logger.error(
        `DASHBOARD_CONTROLLER :: GET_UPCOMING_MEETINGS :: ERROR :: ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
