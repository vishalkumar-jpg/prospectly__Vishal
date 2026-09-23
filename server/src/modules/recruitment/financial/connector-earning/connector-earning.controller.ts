import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  ParseUUIDPipe,
  Logger,
} from "@nestjs/common";
import { RequireModule } from "decorators/require-module.decorator";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { ConnectorEarningService } from "./connector-earning.service";
import { ConnectorEarningQueryDto } from "./connector-earning.dto";

/**
 * Connector Earning endpoints.
 *
 * All routes are behind the global `JwtAuthGuard` + `CsrfGuard`. Every
 * query is scoped to the authenticated user via `@CurrentUser("userId")`,
 * never via a value from the client.
 */
@ApiTags(ApiTagsEnum.Recruitment)
@RequireModule("recruiting")
@Controller("recruitment/earning")
export class ConnectorEarningController {
  private readonly logger = new Logger(ConnectorEarningController.name);

  constructor(private readonly earningService: ConnectorEarningService) {}

  @Get()
  async getEarningList(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: ConnectorEarningQueryDto
  ) {
    try {
      const data = await this.earningService.getEarningList(userId, query);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONNECTOR_EARNING_CONTROLLER :: GET_EARNING_LIST : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("stats")
  async getStats(@Res() res: Response, @CurrentUser("userId") userId: string) {
    try {
      const data = await this.earningService.getStats(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONNECTOR_EARNING_CONTROLLER :: GET_STATS : ERROR : ${error}`
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
      const data = await this.earningService.getDetail(id, userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONNECTOR_EARNING_CONTROLLER :: GET_DETAIL : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
