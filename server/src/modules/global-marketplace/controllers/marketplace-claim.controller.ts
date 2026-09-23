import {
  Controller,
  Get,
  Post,
  Param,
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
import { ApiTagsEnum } from "constants/api-tags.constants";
import { MarketplaceClaimService } from "../services/marketplace-claim.service";
import { VerifyClaimDto, CompleteClaimDto, GetMyClaimsQueryDto } from "../dto";
import { MarketplaceRateLimitGuard } from "../guards";

@ApiTags(ApiTagsEnum.GlobalMarketplace)
@Controller("marketplace")
@UseGuards(JwtAuthGuard, MarketplaceRateLimitGuard)
@ApiBearerAuth()
export class MarketplaceClaimController {
  private readonly logger = new Logger(MarketplaceClaimController.name);

  constructor(private readonly claimService: MarketplaceClaimService) {}

  @Post("claim/verify")
  async verifyClaim(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() dto: VerifyClaimDto
  ) {
    try {
      const data = await this.claimService.verifyClaim(userId, dto);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(`MARKETPLACE :: VERIFY_CLAIM : ERROR : ${error}`);
      return responseUtils.error({ res, error });
    }
  }

  @Post("claim/complete")
  async completeClaim(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() dto: CompleteClaimDto
  ) {
    try {
      const data = await this.claimService.completeClaim(userId, dto.claimId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(`MARKETPLACE :: COMPLETE_CLAIM : ERROR : ${error}`);
      return responseUtils.error({ res, error });
    }
  }

  @Get("claim/:claimId/status")
  async getClaimStatus(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("claimId") claimId: string
  ) {
    try {
      const data = await this.claimService.getClaimStatus(userId, claimId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(`MARKETPLACE :: GET_CLAIM_STATUS : ERROR : ${error}`);
      return responseUtils.error({ res, error });
    }
  }

  @Get("my-claims")
  async getMyClaims(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: GetMyClaimsQueryDto
  ) {
    try {
      const page = parseInt(query.page || "1", 10);
      const limit = Math.min(parseInt(query.limit || "20", 10), 50);
      const data = await this.claimService.getUserClaims(userId, page, limit);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(`MARKETPLACE :: GET_MY_CLAIMS : ERROR : ${error}`);
      return responseUtils.error({ res, error });
    }
  }
}
