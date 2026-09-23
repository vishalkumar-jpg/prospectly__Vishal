import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Logger,
  Res,
  UseGuards,
} from "@nestjs/common";
import { RequireModule } from "decorators/require-module.decorator";
import { Response } from "express";
import { CurrentUser } from "decorators/current-user.decorator";
import { PublicIgnoreJwt } from "decorators/public-ignore-jwt.decorator";
import { SkipCSRF } from "decorators/skip-csrf.decorator";
import { XApiKeyGuard } from "guards/x-api-key.guard";
import responseUtils from "utils/response.utils";
import {
  JobPoolMatchesActiveQueryService,
  JobPoolMatchesClosedQueryService,
  JobPoolMatchesMutationService,
  JobPoolMatchesResumeService,
} from "./services";
import { JobPoolMatchQueueService } from "./job-pool-match-queue.service";
import {
  GetJobPoolMatchesQueryDto,
  ApproveJobPoolMatchParamDto,
  DeclineJobPoolMatchParamDto,
  DeclineJobPoolMatchBodyDto,
} from "./job-pool-matches.dto";

@RequireModule("recruiting")
@Controller("recruitment/job-pool-matches")
export class JobPoolMatchesController {
  private readonly logger = new Logger(JobPoolMatchesController.name);

  constructor(
    private readonly activeQueryService: JobPoolMatchesActiveQueryService,
    private readonly closedQueryService: JobPoolMatchesClosedQueryService,
    private readonly mutationService: JobPoolMatchesMutationService,
    private readonly resumeService: JobPoolMatchesResumeService,
    private readonly queueService: JobPoolMatchQueueService
  ) {}

  @Get()
  async getJobPoolMatches(
    @CurrentUser("userId") userId: string,
    @Query() query: GetJobPoolMatchesQueryDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.activeQueryService.getJobPoolMatches(
        userId,
        query
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `JOB_POOL_MATCHES_CONTROLLER :: GET_JOB_POOL_MATCHES : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Get("closed")
  async getClosedJobPoolMatches(
    @CurrentUser("userId") userId: string,
    @Query() query: GetJobPoolMatchesQueryDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.closedQueryService.getClosedJobPoolMatches(
        userId,
        query
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `JOB_POOL_MATCHES_CONTROLLER :: GET_CLOSED_JOB_POOL_MATCHES : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @PublicIgnoreJwt()
  @SkipCSRF()
  @UseGuards(XApiKeyGuard)
  @Post("backfill-embeddings")
  async backfillContactEmbeddings(@Res() res: Response) {
    try {
      await this.queueService.queueBackfillContactEmbeddings();
      return responseUtils.success(res, {
        data: {
          message:
            "Backfill job queued. Embeddings will be generated in the background.",
        },
      });
    } catch (error) {
      this.logger.error(
        `JOB_POOL_MATCHES_CONTROLLER :: BACKFILL_EMBEDDINGS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Get(":id/resume")
  async getPoolMatchResume(
    @CurrentUser("userId") userId: string,
    @Param() params: ApproveJobPoolMatchParamDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.resumeService.getPoolMatchResumeUrl(
        userId,
        params.id
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `JOB_POOL_MATCHES_CONTROLLER :: GET_POOL_MATCH_RESUME : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Patch(":id/approve")
  async approveMatch(
    @CurrentUser("userId") userId: string,
    @Param() params: ApproveJobPoolMatchParamDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.mutationService.approveMatch(userId, params.id);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `JOB_POOL_MATCHES_CONTROLLER :: APPROVE_MATCH : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Patch(":id/decline")
  async declineMatch(
    @CurrentUser("userId") userId: string,
    @Param() params: DeclineJobPoolMatchParamDto,
    @Body() body: DeclineJobPoolMatchBodyDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.mutationService.declineMatch(
        userId,
        params.id,
        body.reason
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `JOB_POOL_MATCHES_CONTROLLER :: DECLINE_MATCH : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
