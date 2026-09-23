import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  ParseUUIDPipe,
} from "@nestjs/common";
import { RequireModule } from "decorators/require-module.decorator";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { Logger } from "@nestjs/common";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { RequesterSpendingService } from "./requester-spending.service";
import { RequesterSpendingQueryDto } from "./requester-spending.dto";

@ApiTags(ApiTagsEnum.Recruitment)
@RequireModule("recruiting")
@Controller("recruitment/spending")
export class RequesterSpendingController {
  private readonly logger = new Logger(RequesterSpendingController.name);

  constructor(private readonly spendingService: RequesterSpendingService) {}

  @Get()
  async getSpendingList(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: RequesterSpendingQueryDto
  ) {
    try {
      const data = await this.spendingService.getSpendingList(userId, query);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `REQUESTER_SPENDING_CONTROLLER :: GET_SPENDING_LIST : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("stats")
  async getStats(@Res() res: Response, @CurrentUser("userId") userId: string) {
    try {
      const data = await this.spendingService.getStats(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `REQUESTER_SPENDING_CONTROLLER :: GET_STATS : ERROR : ${error}`
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
      const data = await this.spendingService.getDetail(id, userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `REQUESTER_SPENDING_CONTROLLER :: GET_DETAIL : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
