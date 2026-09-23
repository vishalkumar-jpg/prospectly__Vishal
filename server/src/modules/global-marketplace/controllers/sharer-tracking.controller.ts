import { Controller, Get, Param, UseGuards, Res, Logger } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { MarketplacePayoutService } from "../payout";

@ApiTags(ApiTagsEnum.GlobalMarketplace)
@Controller("marketplace")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SharerTrackingController {
  private readonly logger = new Logger(SharerTrackingController.name);

  constructor(
    private readonly marketplacePayoutService: MarketplacePayoutService
  ) {}

  @Get("my-shares/claims")
  async getSharerClaims(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.marketplacePayoutService.getSharerClaims(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(`MARKETPLACE :: GET_SHARER_CLAIMS : ERROR : ${error}`);
      return responseUtils.error({ res, error });
    }
  }

  @Get("my-shares/:shareId/claims")
  async getShareClaimsForShare(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("shareId") shareId: string
  ) {
    try {
      // Get all claims where the user is the sharer
      // TODO: Filter by shareId once we add share-specific claim tracking
      this.logger.debug(`Fetching claims for share ${shareId}`);
      const allClaims =
        await this.marketplacePayoutService.getSharerClaims(userId);
      return responseUtils.success(res, { data: allClaims });
    } catch (error) {
      this.logger.error(
        `MARKETPLACE :: GET_SHARE_CLAIMS_FOR_SHARE : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("my-shares/requests/:requestId/tracking")
  async getSharerTrackingDetails(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("requestId") requestId: string
  ) {
    try {
      const data = await this.marketplacePayoutService.getSharerTrackingDetails(
        userId,
        requestId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `MARKETPLACE :: GET_SHARER_TRACKING_DETAILS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
