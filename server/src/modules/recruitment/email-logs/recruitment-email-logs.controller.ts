import {
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { RequireModule } from "decorators/require-module.decorator";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import {
  CandidateEmailLogsParamDto,
  EmailLogResendParamDto,
  EmailLogsAudienceQueryDto,
  PoolMatchEmailLogsParamDto,
} from "./recruitment-email-logs.dto";
import { RecruitmentEmailLogsQueryService } from "./recruitment-email-logs-query.service";
import { RecruitmentEmailLogsResendService } from "./recruitment-email-logs-resend.service";

@RequireModule("recruiting")
@Controller("recruitment/email-logs")
export class RecruitmentEmailLogsController {
  private readonly logger = new Logger(RecruitmentEmailLogsController.name);

  constructor(
    private readonly queryService: RecruitmentEmailLogsQueryService,
    private readonly resendService: RecruitmentEmailLogsResendService
  ) {}

  @Get("candidates/:candidateId")
  async getCandidateEmailLogs(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param() params: CandidateEmailLogsParamDto,
    @Query() query: EmailLogsAudienceQueryDto
  ) {
    try {
      const audience = query.audience ?? "recruiter";
      const data = await this.queryService.getByCandidateId(
        userId,
        params.candidateId,
        audience
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_EMAIL_LOGS_CONTROLLER :: GET_CANDIDATE : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("pool-matches/:matchId")
  async getPoolMatchEmailLogs(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param() params: PoolMatchEmailLogsParamDto
  ) {
    try {
      const data = await this.queryService.getByPoolMatchId(
        userId,
        params.matchId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_EMAIL_LOGS_CONTROLLER :: GET_POOL_MATCH : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(":logId/resend")
  async resendEmailLog(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param() params: EmailLogResendParamDto,
    @Query() query: EmailLogsAudienceQueryDto
  ) {
    try {
      const audience = query.audience ?? "recruiter";
      const data = await this.resendService.resend(
        userId,
        params.logId,
        audience
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_EMAIL_LOGS_CONTROLLER :: RESEND : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
