import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Res,
  Logger,
  Body,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { appConfig } from "config/app.config";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { MarketplaceShareService } from "../services/marketplace-share.service";
import { MarketplaceAnalyticsService } from "../services/marketplace-analytics.service";
import { ShareRequestDto, GetMySharesQueryDto } from "../dto";
import {
  MarketplaceRateLimitGuard,
  MarketplaceRateLimit,
  MARKETPLACE_RATE_LIMITS,
} from "../guards";

@ApiTags(ApiTagsEnum.GlobalMarketplace)
@Controller("marketplace")
@UseGuards(JwtAuthGuard, MarketplaceRateLimitGuard)
@ApiBearerAuth()
export class MarketplaceShareController {
  private readonly logger = new Logger(MarketplaceShareController.name);

  constructor(
    private readonly shareService: MarketplaceShareService,
    private readonly analyticsService: MarketplaceAnalyticsService
  ) {}

  @Post("share")
  @MarketplaceRateLimit(MARKETPLACE_RATE_LIMITS.SHARE_CREATE)
  async shareRequest(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() dto: ShareRequestDto
  ) {
    try {
      const share = await this.shareService.createShare(userId, dto);
      const data = {
        ...share,
        shareUrl: `${appConfig.frontendUrl}/request/${dto.introductionRequestId}/${share.sharerCode}`,
      };
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(`MARKETPLACE :: SHARE : ERROR : ${error}`);
      return responseUtils.error({ res, error });
    }
  }

  @Get("my-shares")
  async getMyShares(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: GetMySharesQueryDto
  ) {
    try {
      const page = parseInt(query.page || "1", 10);
      const limit = Math.min(parseInt(query.limit || "20", 10), 50);
      const data = await this.shareService.getUserShares(userId, page, limit);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(`MARKETPLACE :: GET_MY_SHARES : ERROR : ${error}`);
      return responseUtils.error({ res, error });
    }
  }

  /*
  @Get("my-shares/:shareId/analytics")
  async getShareAnalytics(
    @Res() res: Response,
    @Param("shareId") shareId: string
  ) {
    try {
      const data = await this.analyticsService.getShareAnalytics(shareId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `MARKETPLACE :: GET_SHARE_ANALYTICS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
  */
}
