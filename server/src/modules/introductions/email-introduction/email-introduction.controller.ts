import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Inject,
  Res,
  Logger,
} from "@nestjs/common";
import responseUtils from "utils/response.utils";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { SendIntroductionEmailDto } from "./email-introduction.dto";
import { EmailIntroductionService } from "./email-introduction.service";

@ApiTags(ApiTagsEnum.IntroductionRequests)
@Controller("introduction-requests")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailIntroductionController {
  private readonly logger = new Logger(EmailIntroductionController.name);

  constructor(
    @Inject(EmailIntroductionService)
    private readonly emailIntroductionService: EmailIntroductionService
  ) {}

  @Post(":id/send-introduction")
  async sendIntroduction(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") requestId: string,
    @Body()
    emailData: SendIntroductionEmailDto
  ) {
    try {
      const data = await this.emailIntroductionService.sendIntroductionEmail(
        userId,
        requestId,
        emailData
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `EMAIL_INTRODUCTION_CONTROLLER :: SEND_INTRODUCTION : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get(":id/email-logs")
  async getEmailLogs(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") requestId: string
  ) {
    try {
      const data = await this.emailIntroductionService.getEmailLogs(
        userId,
        requestId
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `EMAIL_INTRODUCTION_CONTROLLER :: GET_EMAIL_LOGS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
