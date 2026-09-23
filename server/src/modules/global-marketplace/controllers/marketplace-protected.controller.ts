import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  Res,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { GlobalMarketplaceService } from "../global-marketplace.service";
import { BrowseMarketplaceQueryDto } from "../dto";
import {
  MarketplaceRateLimitGuard,
  MarketplaceRateLimit,
  MARKETPLACE_RATE_LIMITS,
} from "../guards";

@ApiTags(ApiTagsEnum.GlobalMarketplace)
@Controller("marketplace")
@UseGuards(JwtAuthGuard, MarketplaceRateLimitGuard)
@ApiBearerAuth()
export class MarketplaceProtectedController {
  private readonly logger = new Logger(MarketplaceProtectedController.name);

  constructor(private readonly marketplaceService: GlobalMarketplaceService) {}

  @Get("browse")
  @MarketplaceRateLimit(MARKETPLACE_RATE_LIMITS.BROWSE)
  async browseRequests(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: BrowseMarketplaceQueryDto
  ) {
    try {
      const data = await this.marketplaceService.browseMarketplace(
        userId,
        query
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(`MARKETPLACE :: BROWSE : ERROR : ${error}`);
      return responseUtils.error({ res, error });
    }
  }

  // @Get("browse/filters")
  // async getFilters(@Res() res: Response) {
  //   try {
  //     const data = await this.marketplaceService.getFilterOptions();
  //     return responseUtils.success(res, { data });
  //   } catch (error) {
  //     this.logger.error(`MARKETPLACE :: GET_FILTERS : ERROR : ${error}`);
  //     return responseUtils.error({ res, error });
  //   }
  // }

  @Delete("request/:requestId")
  async removeRequestFromMarketplace(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("requestId") requestId: string
  ) {
    try {
      await this.marketplaceService.removeRequestFromMarketplace(
        userId,
        requestId
      );
      return responseUtils.success(res, {
        data: { message: "Introduction request removed from marketplace" },
      });
    } catch (error) {
      this.logger.error(`MARKETPLACE :: REMOVE_REQUEST : ERROR : ${error}`);
      return responseUtils.error({ res, error });
    }
  }
}
