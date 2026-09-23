import { Controller, Get, Query, Param, Logger, Res } from "@nestjs/common";
import { RequireModule } from "decorators/require-module.decorator";
import { RequirePermission } from "decorators/require-recruitment-permission.decorator";
import { Response } from "express";
import { CurrentUser } from "decorators/current-user.decorator";
import { RECRUITMENT_PERMISSIONS } from "modules/recruitment/collaboration/recruitment-collaboration.constants";
import responseUtils from "utils/response.utils";
import { FlatReferralFeeService } from "./services/flat-referral-fee.service";
import { ShortlistBreakdownService } from "./services/shortlist-breakdown.service";
import {
  CalculateFlatReferralFeeDto,
  ShortlistBreakdownParamDto,
} from "./interview-cost.dto";

@RequireModule("recruiting")
@Controller("recruitment/interview-cost")
export class InterviewCostController {
  private readonly logger = new Logger(InterviewCostController.name);

  constructor(
    private readonly flatReferralFeeService: FlatReferralFeeService,
    private readonly shortlistBreakdownService: ShortlistBreakdownService
  ) {}

  @Get("flat-referral/calculate")
  async calculateFlatReferralFee(
    @Query() query: CalculateFlatReferralFeeDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.flatReferralFeeService.calculateFlatReferralFee(
        query.flatFee
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `INTERVIEW_COST_CONTROLLER :: CALCULATE_FLAT_REFERRAL_FEE : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  // Returns fee details + the owner's saved card metadata, so gate it with the
  // shortlist permission (not candidate.view) — view-only collaborators must not
  // see billing info.
  @RequirePermission(RECRUITMENT_PERMISSIONS.CANDIDATE_SHORTLIST, {
    from: "candidate",
  })
  @Get("shortlist-breakdown/:candidateId")
  async getShortlistBreakdown(
    @CurrentUser("userId") userId: string,
    @Param() params: ShortlistBreakdownParamDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.shortlistBreakdownService.getBreakdown(
        params.candidateId,
        userId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `INTERVIEW_COST_CONTROLLER :: GET_SHORTLIST_BREAKDOWN : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
