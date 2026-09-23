import { Controller, Get, Query, Logger, Res } from "@nestjs/common";
import { RequireModule } from "decorators/require-module.decorator";
import { Response } from "express";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { MarketplaceQueryService } from "./services";
import { GetMarketplaceJobsQueryDto } from "./marketplace.dto";
import { MARKETPLACE_MESSAGES } from "./marketplace.constants";

@RequireModule("recruiting")
@Controller("recruitment/marketplace")
export class MarketplaceController {
  private readonly logger = new Logger(MarketplaceController.name);

  constructor(private readonly queryService: MarketplaceQueryService) {}

  @Get()
  async getMarketplaceJobs(
    @CurrentUser("userId") userId: string,
    @Query() query: GetMarketplaceJobsQueryDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.queryService.getMarketplaceJobs(userId, query);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `MARKETPLACE_CONTROLLER :: GET_MARKETPLACE_JOBS : ERROR : ${error}`
      );
      return responseUtils.error({
        res,
        error: new Error(MARKETPLACE_MESSAGES.ERROR.FETCH_FAILED),
      });
    }
  }
}
