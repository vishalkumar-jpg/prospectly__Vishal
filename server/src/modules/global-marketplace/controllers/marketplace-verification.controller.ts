import { Controller, Get, Post, UseGuards, Res, Logger } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { ClaimVerificationService } from "../claim";
import { MarketplaceRateLimitGuard } from "../guards";

@ApiTags(ApiTagsEnum.GlobalMarketplace)
@Controller("marketplace")
@UseGuards(JwtAuthGuard, MarketplaceRateLimitGuard)
@ApiBearerAuth()
export class MarketplaceVerificationController {
  private readonly logger = new Logger(MarketplaceVerificationController.name);

  constructor(
    private readonly claimVerificationService: ClaimVerificationService
  ) {}

  @Get("verification/status")
  async getVerificationStatus(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data =
        await this.claimVerificationService.getVerificationStatus(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `MARKETPLACE :: GET_VERIFICATION_STATUS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("claim/trigger-verification")
  async triggerManualVerification(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data =
        await this.claimVerificationService.triggerManualVerification(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `MARKETPLACE :: TRIGGER_VERIFICATION : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
