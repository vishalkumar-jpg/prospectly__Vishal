import {
  Controller,
  Get,
  Param,
  UseGuards,
  Inject,
  Res,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { BountyStagesService } from "./bounty-stages.service";
import { BOUNTY_STAGES_MESSAGES } from "./bounty-stages.constants";

@ApiTags(ApiTagsEnum.BountyStages)
@Controller("bounty-stages")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BountyStagesController {
  private readonly logger = new Logger(BountyStagesController.name);

  constructor(
    @Inject(BountyStagesService)
    private readonly bountyStagesService: BountyStagesService
  ) {}

  @Get()
  async getBountyStages(@Res() res: Response) {
    try {
      const data = await this.bountyStagesService.getBountyStages();
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `BOUNTY_STAGES_CONTROLLER :: GET_ALL : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get(":id")
  async getBountyStageById(@Res() res: Response, @Param("id") id: string) {
    try {
      const data = await this.bountyStagesService.getBountyStageById(id);

      if (!data) {
        throw new NotFoundException(
          BOUNTY_STAGES_MESSAGES.ERROR.BOUNTY_STAGE_NOT_FOUND
        );
      }

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `BOUNTY_STAGES_CONTROLLER :: GET_BY_ID : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
