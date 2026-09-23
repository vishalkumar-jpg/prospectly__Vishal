import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Res,
  Logger,
} from "@nestjs/common";
import { RequireModule } from "decorators/require-module.decorator";
import { Response } from "express";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { ApiTagsEnum } from "constants/api-tags.constants";
import {
  RecruitmentNotificationsQueryService,
  RecruitmentNotificationsDispatchService,
} from "./services";
import {
  GetOrganisationsQueryDto,
  NotifyPreviewQueryDto,
  SendJobNotificationDto,
} from "./recruitment-notifications.dto";
import { RECRUITMENT_NOTIFICATION_MESSAGES } from "./recruitment-notifications.constants";

@ApiTags(ApiTagsEnum.Recruitment)
@RequireModule("recruiting")
@Controller()
export class RecruitmentNotificationsController {
  private readonly logger = new Logger(RecruitmentNotificationsController.name);

  constructor(
    private readonly queryService: RecruitmentNotificationsQueryService,
    private readonly dispatchService: RecruitmentNotificationsDispatchService
  ) {}

  @Get("recruitment/organisations")
  @ApiBearerAuth()
  async getOrganisations(
    @Query() query: GetOrganisationsQueryDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.queryService.getOrganisations(query);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_NOTIFICATIONS_CONTROLLER :: GET_ORGANISATIONS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Get("recruitment/jobs/:id/notify/preview")
  @ApiBearerAuth()
  async getNotifyPreview(
    @CurrentUser("userId") userId: string,
    @Param("id") jobId: string,
    @Query() query: NotifyPreviewQueryDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.queryService.getNotifyPreview(
        userId,
        jobId,
        query.organisationIds
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_NOTIFICATIONS_CONTROLLER :: GET_NOTIFY_PREVIEW : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Post("recruitment/jobs/:id/notify")
  @ApiBearerAuth()
  async sendNotification(
    @CurrentUser("userId") userId: string,
    @Param("id") jobId: string,
    @Body() dto: SendJobNotificationDto,
    @Res() res: Response
  ) {
    try {
      const notification = await this.dispatchService.sendJobNotification(
        userId,
        jobId,
        dto.organisationIds
      );
      return responseUtils.success(res, {
        data: {
          notification,
          message: RECRUITMENT_NOTIFICATION_MESSAGES.SUCCESS.QUEUED,
        },
      });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_NOTIFICATIONS_CONTROLLER :: SEND_NOTIFICATION : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
