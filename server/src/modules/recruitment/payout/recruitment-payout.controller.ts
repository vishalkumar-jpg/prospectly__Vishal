import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Logger,
  Res,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { RequireModule } from "decorators/require-module.decorator";
import { RequirePermission } from "decorators/require-recruitment-permission.decorator";
import { Response } from "express";
import { CurrentUser } from "decorators/current-user.decorator";
import { RECRUITMENT_PERMISSIONS } from "modules/recruitment/collaboration/recruitment-collaboration.constants";
import responseUtils from "utils/response.utils";
import { RecruitmentPayoutOutcomeService } from "./services/recruitment-payout-outcome.service";
import { RecruitmentPayoutReleaseService } from "./services/recruitment-payout-release.service";
import { RecruitmentPayoutStateService } from "./services/recruitment-payout-state.service";
import { RecruitmentPayoutFundService } from "./services/recruitment-payout-fund.service";
import {
  FundPayoutTopUpDto,
  MarkInterviewOutcomeDto,
  MarkInterviewOutcomeParamDto,
  ReleasePayoutDto,
} from "./recruitment-payout.dto";

@RequireModule("recruiting")
@Controller("recruitment/payout")
export class RecruitmentPayoutController {
  private readonly logger = new Logger(RecruitmentPayoutController.name);

  constructor(
    private readonly outcomeService: RecruitmentPayoutOutcomeService,
    private readonly releaseService: RecruitmentPayoutReleaseService,
    private readonly stateService: RecruitmentPayoutStateService,
    private readonly fundService: RecruitmentPayoutFundService
  ) {}

  @RequirePermission(RECRUITMENT_PERMISSIONS.CANDIDATE_VIEW, {
    from: "candidate",
  })
  @Get(":candidateId/state")
  async getPayoutState(
    @CurrentUser("userId") userId: string,
    @Param() params: MarkInterviewOutcomeParamDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.stateService.getState(userId, params.candidateId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_PAYOUT_CONTROLLER :: GET_PAYOUT_STATE : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequirePermission(RECRUITMENT_PERMISSIONS.CANDIDATE_MARK_OUTCOME, {
    from: "candidate",
  })
  @Patch(":candidateId/interview-outcome")
  async markInterviewOutcome(
    @CurrentUser("userId") userId: string,
    @Param() params: MarkInterviewOutcomeParamDto,
    @Body() dto: MarkInterviewOutcomeDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.outcomeService.markOutcome(
        params.candidateId,
        dto,
        userId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_PAYOUT_CONTROLLER :: MARK_INTERVIEW_OUTCOME : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  // Step 1 of the two-step release: collect the post-hire fee top-up only, so a
  // declined card is reported as a payment failure instead of a payout failure.
  // Guarded by the same permission as /release — it is the first half of it.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @RequirePermission(RECRUITMENT_PERMISSIONS.PAYOUT_RELEASE, {
    from: "candidate",
  })
  @Post(":candidateId/fund")
  async fundPayoutTopUp(
    @CurrentUser("userId") userId: string,
    @Param() params: MarkInterviewOutcomeParamDto,
    @Body() dto: FundPayoutTopUpDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.fundService.fundTopUp(
        userId,
        params.candidateId,
        dto
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_PAYOUT_CONTROLLER :: FUND_PAYOUT_TOPUP : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequirePermission(RECRUITMENT_PERMISSIONS.PAYOUT_RELEASE, {
    from: "candidate",
  })
  @Post(":candidateId/release")
  async releasePayouts(
    @CurrentUser("userId") userId: string,
    @Param() params: MarkInterviewOutcomeParamDto,
    @Body() dto: ReleasePayoutDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.releaseService.releasePayouts(
        userId,
        params.candidateId,
        dto
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_PAYOUT_CONTROLLER :: RELEASE_PAYOUTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
