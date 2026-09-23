import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Res,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import type { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { ReferralsService } from "./referrals.service";
import { SendReferralInviteDto } from "./referrals.dto";

@ApiTags(ApiTagsEnum.Referrals)
@Controller("referrals")
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get("all")
  @ApiOperation({ summary: "Get all users' referral progress (Admin only)" })
  @ApiResponse({ status: 200, description: "All referral progress retrieved" })
  async getAllReferralProgress(@Res() res: Response) {
    try {
      const allProgress = await this.referralsService.getAllReferralProgress();
      return responseUtils.success(res, { data: allProgress });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("progress")
  @ApiOperation({ summary: "Get user's referral progress" })
  @ApiResponse({ status: 200, description: "Referral progress retrieved" })
  async getReferralProgress(
    @CurrentUser("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      const progress =
        await this.referralsService.getUserReferralProgress(userId);

      const data =
        this.referralsService.formatReferralProgressForListing(progress);

      return responseUtils.success(res, {
        data,
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Post("invite")
  @ApiOperation({ summary: "Send referral invite" })
  @ApiResponse({ status: 200, description: "Invite sent successfully" })
  async sendReferralInvite(
    @CurrentUser("userId") userId: string,
    @Body() body: SendReferralInviteDto,
    @Res() res: Response
  ) {
    try {
      const result = await this.referralsService.sendReferralInvite(
        userId,
        body.email,
        body.planId,
        body.organisationId
      );

      return responseUtils.success(res, { data: result });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("earned-coupons")
  @ApiOperation({ summary: "Get earned coupons" })
  @ApiResponse({ status: 200, description: "Earned coupons retrieved" })
  async getEarnedCoupons(
    @CurrentUser("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      const coupons = await this.referralsService.getEarnedCoupons(userId);

      return responseUtils.success(res, { data: coupons });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("verified-contacts/:planId")
  @ApiOperation({ summary: "Get verified contact count for a plan" })
  @ApiResponse({ status: 200, description: "Verified contacts retrieved" })
  async getVerifiedContacts(
    @CurrentUser("userId") userId: string,
    @Param("planId") planId: string,
    @Res() res: Response
  ) {
    try {
      const count = await this.referralsService.calculateVerifiedContacts(
        userId,
        planId
      );

      return responseUtils.success(res, { data: { count } });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }
}
