import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  Logger,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { RequireModule } from "decorators/require-module.decorator";
import { Response } from "express";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { describeDbError } from "utils/db-error.utils";
import {
  ConnectorPipelineService,
  ConnectorPipelineCandidateDetailService,
  ConnectorPipelineCandidateResumeService,
  ConnectorPipelinePoolDetailService,
} from "./services";
import { GetConnectorPipelineQueryDto } from "./connector-pipeline.dto";
import { CONNECTOR_PIPELINE_MESSAGES } from "./connector-pipeline.constants";
import { ResumeSearchService } from "../resume-search/services";
import { ResumeSearchDto } from "../resume-search/resume-search.dto";

@RequireModule("recruiting")
@Controller("recruitment/connector-pipeline")
export class ConnectorPipelineController {
  private readonly logger = new Logger(ConnectorPipelineController.name);

  constructor(
    private readonly connectorPipelineService: ConnectorPipelineService,
    private readonly candidateDetailService: ConnectorPipelineCandidateDetailService,
    private readonly candidateResumeService: ConnectorPipelineCandidateResumeService,
    private readonly poolDetailService: ConnectorPipelinePoolDetailService,
    private readonly resumeSearchService: ResumeSearchService
  ) {}

  @Get("job/:jobId")
  async getJobBoard(
    @CurrentUser("userId") userId: string,
    @Param("jobId", ParseUUIDPipe) jobId: string,
    @Query() query: GetConnectorPipelineQueryDto,
    @Res() res: Response
  ) {
    try {
      const board = await this.connectorPipelineService.getJobBoard(
        userId,
        jobId,
        query
      );

      return responseUtils.success(res, {
        data: {
          ...board,
          message: CONNECTOR_PIPELINE_MESSAGES.SUCCESS.PIPELINE_FETCHED,
        },
      });
    } catch (error) {
      this.logger.error(
        `CONNECTOR_PIPELINE_CONTROLLER :: GET_JOB_BOARD : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("candidate/:candidateId/resume")
  async getCandidateResume(
    @CurrentUser("userId") userId: string,
    @Param("candidateId", ParseUUIDPipe) candidateId: string,
    @Res() res: Response
  ) {
    try {
      const data = await this.candidateResumeService.getCandidateResumeUrl(
        userId,
        candidateId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONNECTOR_PIPELINE_CONTROLLER :: GET_CANDIDATE_RESUME : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("candidate/:candidateId")
  async getCandidateDetail(
    @CurrentUser("userId") userId: string,
    @Param("candidateId", ParseUUIDPipe) candidateId: string,
    @Res() res: Response
  ) {
    try {
      const data = await this.candidateDetailService.getCandidateDetail(
        userId,
        candidateId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONNECTOR_PIPELINE_CONTROLLER :: GET_CANDIDATE_DETAIL : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("match/:matchId")
  async getPoolMatchDetail(
    @CurrentUser("userId") userId: string,
    @Param("matchId", ParseUUIDPipe) matchId: string,
    @Res() res: Response
  ) {
    try {
      const data = await this.poolDetailService.getPoolMatchDetail(
        userId,
        matchId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONNECTOR_PIPELINE_CONTROLLER :: GET_POOL_MATCH_DETAIL : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  /**
   * The connector-scoped twin of the recruiter's resume search. Deliberately a
   * separate route rather than a relaxed guard on that one: the recruiter route
   * reads the whole job, so a connector reaching it would see other connectors'
   * referrals. Here the scope carries the connector id into the query's only
   * tenancy boundary, and this module's convention of no @RequirePermission
   * holds because that per-connector join *is* the authorization.
   */
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post("job/:jobId/resume-search")
  async searchResumes(
    @CurrentUser("userId") userId: string,
    @Param("jobId", ParseUUIDPipe) jobId: string,
    @Body() dto: ResumeSearchDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.resumeSearchService.search(
        { kind: "connector", jobId, connectorUserId: userId },
        dto.query,
        userId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONNECTOR_PIPELINE_CONTROLLER :: SEARCH_RESUMES : ERROR : ${describeDbError(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error });
    }
  }
}
