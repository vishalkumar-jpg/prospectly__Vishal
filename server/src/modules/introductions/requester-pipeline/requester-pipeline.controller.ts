import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  Res,
  Logger,
} from "@nestjs/common";
import responseUtils from "utils/response.utils";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { ArchiveRequesterIntroductionDto } from "./requester-archive.dto";
import { RequesterPipelineService } from "./requester-pipeline.service";
import { RequesterArchiveService } from "./requester-archive.service";
import {
  PipelineSearchQueryDto,
  RequesterPipelineStatsQueryDto,
} from "../pipeline-search-query.dto";

@ApiTags(ApiTagsEnum.IntroductionRequests)
@Controller("requester/introduction-requests")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RequesterPipelineController {
  private readonly logger = new Logger(RequesterPipelineController.name);

  constructor(
    @Inject(RequesterPipelineService)
    private readonly requesterPipelineService: RequesterPipelineService,
    @Inject(RequesterArchiveService)
    private readonly requesterArchiveService: RequesterArchiveService
  ) {}

  @Get("stats")
  async getMyRequestsStats(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: RequesterPipelineStatsQueryDto
  ) {
    try {
      const data = await this.requesterPipelineService.getMyRequestsStats(
        userId,
        {
          search: query.search,
          statsContext: query.statsContext,
        }
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `REQUESTER_PIPELINE_CONTROLLER :: GET_MY_REQUESTS_STATS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("pipeline")
  async getRequestPipeline(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: PipelineSearchQueryDto
  ) {
    try {
      const data = await this.requesterPipelineService.getRequestPipeline(
        userId,
        query.search
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `REQUESTER_PIPELINE_CONTROLLER :: GET_REQUEST_PIPELINE : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post(":id/archive")
  async archiveIntroduction(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") requestId: string,
    @Body() body: ArchiveRequesterIntroductionDto
  ) {
    try {
      const data = await this.requesterArchiveService.archiveIntroduction(
        userId,
        requestId,
        body
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `REQUESTER_PIPELINE_CONTROLLER :: ARCHIVE_INTRODUCTION : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("archive")
  async getArchivedRequests(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: PipelineSearchQueryDto
  ) {
    try {
      const data = await this.requesterPipelineService.getArchivedRequests(
        userId,
        query.search
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `REQUESTER_PIPELINE_CONTROLLER :: GET_ARCHIVED_REQUESTS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
