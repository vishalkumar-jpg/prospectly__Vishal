import { Controller, Get, Query, UseGuards, Inject } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import { parseClampPagination } from "utils/pagination.utils";
import { TrustScoreService } from "./trust-score.service";


@ApiTags("Trust Score")
@Controller("trust-score")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TrustScoreController {
  constructor(
    @Inject(TrustScoreService)
    private readonly trustScoreService: TrustScoreService
  ) {}

  @Get("me")
  @ApiOperation({ summary: "Get current user's trust score" })
  async getMyScore(@CurrentUser("userId") userId: string) {
    return this.trustScoreService.getMyScore(userId);
  }

  @Get("me/rules")
  @ApiOperation({
    summary: "Get earned and pending trust score rules for current user",
  })
  async getMyRules(@CurrentUser("userId") userId: string) {
    return this.trustScoreService.getMyRules(userId);
  }

  @Get("me/history")
  @ApiOperation({ summary: "Get trust score history for current user" })
  async getMyHistory(
    @CurrentUser("userId") userId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    const { newLimit, newOffset } = parseClampPagination(limit, offset);

    return this.trustScoreService.getMyHistory(userId, newLimit, newOffset);
  }
}
