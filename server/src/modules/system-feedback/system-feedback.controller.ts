import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Res,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { SystemFeedbackService } from "./system-feedback.service";
import { CreateSystemFeedbackDto } from "./system-feedback.dto";

@ApiTags(ApiTagsEnum.SYSTEM_FEEDBACK)
@Controller("system-feedback")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SystemFeedbackController {
  private readonly logger = new Logger(SystemFeedbackController.name);
  constructor(private readonly systemFeedbackService: SystemFeedbackService) {}

  @Post()
  async createFeedback(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: CreateSystemFeedbackDto
  ) {
    try {
      const data = await this.systemFeedbackService.createFeedback(
        userId,
        body
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `SYSTEM_FEEDBACK_CONTROLLER :: CREATE_FEEDBACK : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("me")
  async findMyFeedback(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.systemFeedbackService.findMyFeedback(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `SYSTEM_FEEDBACK_CONTROLLER :: FIND_MY_FEEDBACK : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
