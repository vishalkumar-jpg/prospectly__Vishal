import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  Req,
  Logger,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "decorators/public.decorator";
import responseUtils from "utils/response.utils";
import { Response, Request } from "express";
import { getClientIp } from "utils/ip-extraction.util";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { GlobalMarketplaceService } from "../global-marketplace.service";
import { MarketplaceAnalyticsService } from "../services/marketplace-analytics.service";
import { TrackEventDto } from "../dto";
import {
  MarketplaceRateLimitGuard,
  MarketplaceRateLimit,
  MARKETPLACE_RATE_LIMITS,
  MarketplaceBotDetectionGuard,
} from "../guards";

@ApiTags(ApiTagsEnum.GlobalMarketplace)
@Controller("marketplace")
@UseGuards(MarketplaceRateLimitGuard)
export class MarketplacePublicController {
  private readonly logger = new Logger(MarketplacePublicController.name);

  constructor(
    private readonly marketplaceService: GlobalMarketplaceService,
    private readonly analyticsService: MarketplaceAnalyticsService
  ) {}

  @Public()
  @Get("request/:requestId/:sharerCode")
  @MarketplaceRateLimit(MARKETPLACE_RATE_LIMITS.PUBLIC_REQUEST_VIEW)
  async getPublicRequest(
    @Res() res: Response,
    @Param("requestId") requestId: string,
    @Param("sharerCode") sharerCode: string
  ) {
    try {
      const data = await this.marketplaceService.getPublicRequestDetails(
        requestId,
        sharerCode
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(`MARKETPLACE :: GET_PUBLIC_REQUEST : ERROR : ${error}`);
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @Post("request/:requestId/:sharerCode/track")
  @UseGuards(MarketplaceBotDetectionGuard)
  @MarketplaceRateLimit(MARKETPLACE_RATE_LIMITS.TRACK_EVENT)
  async trackEvent(
    @Res() res: Response,
    @Req() req: Request,
    @Param("sharerCode") sharerCode: string,
    @Body() dto: TrackEventDto
  ) {
    try {
      dto.sharerCode = sharerCode;

      const ip = getClientIp(req);

      const userAgent = req.headers["user-agent"];
      const referrer = req.headers["referer"];

      const data = await this.analyticsService.trackEvent(
        dto,
        ip,
        userAgent,
        referrer
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(`MARKETPLACE :: TRACK_EVENT : ERROR : ${error}`);
      return responseUtils.error({ res, error });
    }
  }
}
