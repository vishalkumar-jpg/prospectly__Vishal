import {
  Controller,
  Post,
  Get,
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
import { Public } from "decorators/public.decorator";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { SubmitFeedbackDto, GetReviewsQueryDto } from "./feedback.dto";
import { FeedbackService } from "./feedback.service";
import { FeedbackSubmissionService } from "./feedback-submission.service";

@ApiTags(ApiTagsEnum.IntroductionRequests)
@Controller("introduction-requests")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(
    @Inject(FeedbackService)
    private readonly feedbackService: FeedbackService,
    @Inject(FeedbackSubmissionService)
    private readonly feedbackSubmissionService: FeedbackSubmissionService
  ) {}

  @Get(":id/feedback")
  async getExistingFeedback(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") requestId: string,
    @Query("feedbackType") feedbackType: "meeting_feedback" | "peer_feedback"
  ) {
    try {
      const data = await this.feedbackService.getExistingFeedback(
        userId,
        requestId,
        feedbackType
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `FEEDBACK_CONTROLLER :: GET_EXISTING_FEEDBACK : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post(":id/feedback")
  async submitFeedback(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") requestId: string,
    @Body()
    feedbackData: SubmitFeedbackDto
  ) {
    try {
      const data = await this.feedbackSubmissionService.submitFeedback(
        userId,
        requestId,
        feedbackData
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `FEEDBACK_CONTROLLER :: SUBMIT_FEEDBACK : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("check-pending-feedback")
  async checkPendingFeedback(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.feedbackService.checkPendingFeedback(userId);

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `FEEDBACK_CONTROLLER :: CHECK_PENDING_FEEDBACK : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @Get("reviews/:userId")
  async getUserReviews(
    @Res() res: Response,
    @Param("userId") userId: string,
    @Query() query: GetReviewsQueryDto
  ) {
    try {
      const data = await this.feedbackService.getUserReviews(userId, query);

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `FEEDBACK_CONTROLLER :: GET_USER_REVIEWS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
