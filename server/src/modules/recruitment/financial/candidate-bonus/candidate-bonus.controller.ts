import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  ParseUUIDPipe,
  Logger,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { CandidateBonusService } from "./candidate-bonus.service";
import { CandidateBonusQueryDto } from "./candidate-bonus.dto";

/**
 * Candidate Bonus endpoints — a hired candidate's own success-fee payouts.
 *
 * Intentionally NOT gated by `@RequireModule("recruiting")`: this is the
 * candidate's own view (surfaced on the always-available My Applications page),
 * so it must be reachable by any authenticated user. All routes stay behind the
 * global `JwtAuthGuard` + `CsrfGuard`, and every query is scoped to the
 * authenticated user via `@CurrentUser("userId")` (never a client value) — so a
 * candidate can only ever see their own bonuses. Detail returns 404 on a miss.
 */
@ApiTags(ApiTagsEnum.Recruitment)
@Controller("recruitment/candidate-bonus")
export class CandidateBonusController {
  private readonly logger = new Logger(CandidateBonusController.name);

  constructor(private readonly bonusService: CandidateBonusService) {}

  @Get()
  async getBonusList(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: CandidateBonusQueryDto
  ) {
    try {
      const data = await this.bonusService.getList(userId, query);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_BONUS_CONTROLLER :: GET_BONUS_LIST : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get(":id")
  async getDetail(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    try {
      const data = await this.bonusService.getDetail(id, userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_BONUS_CONTROLLER :: GET_DETAIL : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
