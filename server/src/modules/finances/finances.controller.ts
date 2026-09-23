import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Inject,
  Res,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { FinancesService } from "./finances.service";
import {
  TransactionHistoryQueryDto,
  PayoutHistoryQueryDto,
  OverviewQueryDto,
  PayoutTimelineQueryDto,
  RecentActivityQueryDto,
} from "./finances.dto";

import { TimeRangeEnum } from "./finances.constants";

@ApiTags(ApiTagsEnum.Finances)
@Controller("finances")
@UseGuards(JwtAuthGuard)
export class FinancesController {
  constructor(
    @Inject(FinancesService) private readonly financesService: FinancesService
  ) {}

  @Get("transactions")
  async getTransactionHistory(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: TransactionHistoryQueryDto
  ) {
    try {
      const data = await this.financesService.getTransactionHistory(
        userId,
        query
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("payouts")
  async getPayoutHistory(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: PayoutHistoryQueryDto
  ) {
    try {
      const data = await this.financesService.getPayoutHistory(userId, query);
      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("requests/:requestId/transactions")
  async getRequestTransactionDetails(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("requestId") requestId: string
  ) {
    try {
      const data = await this.financesService.getRequestTransactionDetails(
        userId,
        requestId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("requests/:requestId/payout")
  async getPayoutDetailsForRequest(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("requestId") requestId: string
  ) {
    try {
      const data = await this.financesService.getPayoutDetailsForRequest(
        userId,
        requestId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("overview/summary")
  async getFinancialSummary(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.financesService.getFinancialSummary(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("overview/revenue-chart")
  async getRevenueChart(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: OverviewQueryDto
  ) {
    try {
      const data = await this.financesService.getRevenueChart(
        userId,
        query.timeRange || TimeRangeEnum.DAYS_30
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("overview/breakdown")
  async getTransactionBreakdown(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: OverviewQueryDto
  ) {
    try {
      const data = await this.financesService.getTransactionBreakdown(
        userId,
        query.timeRange || TimeRangeEnum.DAYS_30
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("overview/recent-activity")
  async getRecentActivity(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: RecentActivityQueryDto
  ) {
    try {
      const data = await this.financesService.getRecentActivity(
        userId,
        query.limit || 5
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("payout-timeline")
  async getPayoutTimeline(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: PayoutTimelineQueryDto
  ) {
    try {
      const data = await this.financesService.getPayoutTimeline(
        userId,
        query.limit || 5
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }
}
