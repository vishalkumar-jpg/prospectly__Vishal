import {
  Controller,
  Get,
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
import { ProfilesService } from "modules/profiles/profiles.service";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { IntroductionsService } from "./introductions.service";
import {
  ConnectorPipelineStatsQueryDto,
  PipelineSearchQueryDto,
} from "./pipeline-search-query.dto";

// Additional controller for legacy route compatibility
@ApiTags(ApiTagsEnum.IntroductionRequests)
@Controller("introduction-requests")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IntroductionRequestsController {
  private readonly logger = new Logger(IntroductionRequestsController.name);

  constructor(
    @Inject(IntroductionsService)
    private readonly introductionsService: IntroductionsService,
    @Inject(ProfilesService)
    private readonly profilesService: ProfilesService
  ) {}

  @Get("inbox")
  async getInbox(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: PipelineSearchQueryDto
  ) {
    try {
      const data = await this.introductionsService.getInboxRequests(
        userId,
        query.search
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `INTRODUCTION_REQUESTS_CONTROLLER :: GET_INBOX : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("introduction-pipeline/stats")
  async getIntroductionPipelineStats(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: ConnectorPipelineStatsQueryDto
  ) {
    try {
      // Use the service method which accounts for multi-connector flow
      const data = await this.introductionsService.getConnectorPipelineStats(
        userId,
        {
          search: query.search,
          statsContext: query.statsContext,
        }
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `INTRODUCTION_REQUESTS_CONTROLLER :: GET_INTRODUCTION_PIPELINE_STATS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("connector/pipeline")
  async getIntroductionPipeline(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: PipelineSearchQueryDto
  ) {
    try {
      const data = await this.introductionsService.getIntroductionPipeline(
        userId,
        query.search
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `INTRODUCTION_REQUESTS_CONTROLLER :: GET_INTRODUCTION_PIPELINE : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("connector/unfulfilled")
  async getUnfulfilledIntroductions(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: PipelineSearchQueryDto
  ) {
    try {
      const data = await this.introductionsService.getUnfulfilledIntroductions(
        userId,
        query.search
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `INTRODUCTION_REQUESTS_CONTROLLER :: GET_UNFULFILLED_INTRODUCTIONS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("introduction-pipeline/archive")
  async getArchivedIntroductions(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: PipelineSearchQueryDto
  ) {
    try {
      const data = await this.introductionsService.getArchivedIntroductions(
        userId,
        query.search
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `INTRODUCTION_REQUESTS_CONTROLLER :: GET_ARCHIVED_INTRODUCTIONS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("requester-eligibility")
  async checkRequesterEligibility(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data =
        await this.introductionsService.checkRequesterEligibility(userId);

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `INTRODUCTION_REQUESTS_CONTROLLER :: CHECK_REQUESTER_ELIGIBILITY : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("active-count")
  async getActiveCount(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const current = await this.introductionsService.getActiveCount(userId);
      const profile = await this.profilesService.getProfileById(userId);
      const limit = profile?.maxConcurrentRequests || 1;

      return responseUtils.success(res, {
        data: {
          current,
          limit,
          canCreate: current < limit,
        },
      });
    } catch (error) {
      this.logger.error(
        `INTRODUCTION_REQUESTS_CONTROLLER :: GET_ACTIVE_COUNT : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
