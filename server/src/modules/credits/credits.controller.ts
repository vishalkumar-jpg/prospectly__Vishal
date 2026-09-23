import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import { parseClampPagination } from "utils/pagination.utils";
import { CreditsService } from "./credits.service";


@ApiTags("Credits")
@Controller("credits")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get("me")
  @ApiOperation({ summary: "Get current user's credit balance" })
  async getMyCreditBalance(@CurrentUser("userId") userId: string) {
    return this.creditsService.getMyCreditBalance(userId);
  }

  @Get("rules")
  @ApiOperation({
    summary: "Get credit rules with earned/pending status for current user",
  })
  async getCreditRules(@CurrentUser("userId") userId: string) {
    return this.creditsService.getCreditRulesForUI(userId);
  }

  @Get("me/history")
  @ApiOperation({ summary: "Get credit history for current user" })
  async getMyCreditHistory(
    @CurrentUser("userId") userId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    const { newLimit, newOffset } = parseClampPagination(limit, offset);
    return this.creditsService.getMyCreditHistory(userId, newLimit, newOffset);
  }
}
