import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Res,
  UseGuards,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import { Response } from "express";
import responseUtils from "utils/response.utils";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { IntroductionEstimatesHelper } from "./helpers/introduction-estimates.helper";
import { INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES } from "./introduction-potential-connectors.constants";

@ApiTags(ApiTagsEnum.IntroductionPotentialConnectors)
@Controller("introduction-potential-connectors")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IntroductionPotentialConnectorsController {
  private readonly logger = new Logger(
    IntroductionPotentialConnectorsController.name
  );

  constructor(
    private readonly introductionEstimatesHelper: IntroductionEstimatesHelper
  ) {}

  @Get(":contactId/estimates")
  async getEstimates(
    @Res() res: Response,
    @Param("contactId", ParseIntPipe) contactId: number,
    @CurrentUser("userId") userId: string
  ) {
    try {
      // 1. Authorization check
      const isAuthorized =
        await this.introductionEstimatesHelper.isAuthorizedForContact(
          contactId,
          userId
        );

      if (!isAuthorized) {
        throw new ForbiddenException(
          INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES.ERROR.NOT_AUTHORIZED
        );
      }

      // 2. Fetch estimates
      const estimates =
        await this.introductionEstimatesHelper.getConnectorEstimates(contactId);

      return responseUtils.success(res, {
        data: estimates,
      });
    } catch (error) {
      this.logger.error(
        `INTRODUCTION_POTENTIAL_CONNECTORS_CONTROLLER :: GET_ESTIMATES : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
