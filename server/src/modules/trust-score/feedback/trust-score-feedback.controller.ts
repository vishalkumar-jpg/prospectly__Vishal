import {
  Controller,
  Get,
  Query,
  UseGuards,
  Inject,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import { parseClampPagination } from "utils/pagination.utils";
import { TrustScoreFeedbackService } from "./trust-score-feedback.service";


@ApiTags("Trust Score")
@Controller("trust-score/feedback")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TrustScoreFeedbackController {
  private readonly logger = new Logger(TrustScoreFeedbackController.name);

  constructor(
    @Inject(TrustScoreFeedbackService)
    private readonly trustScoreFeedbackService: TrustScoreFeedbackService
  ) {}

  @Get("me")
  @ApiOperation({
    summary: "Get current user's feedback with pagination and statistics",
  })
  async getMyFeedback(
    @CurrentUser("userId") userId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    const { newLimit, newOffset } = parseClampPagination(limit, offset);
    return this.trustScoreFeedbackService.getMyFeedback(
      userId,
      newLimit,
      newOffset
    );
  }

  @Get("me/stats")
  @ApiOperation({
    summary: "Get feedback statistics for current user",
  })
  async getMyStats(@CurrentUser("userId") userId: string) {
    return this.trustScoreFeedbackService.getMyStats(userId);
  }
}
