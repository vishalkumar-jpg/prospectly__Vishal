import { Controller, Get, UseGuards, Res, Logger } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { ContactSourceStatusService } from "./contact-source-status.service";

@ApiTags(ApiTagsEnum.ContactSourceStatus)
@Controller("contact-source-status")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContactSourceStatusController {
  private readonly logger = new Logger(ContactSourceStatusController.name);

  constructor(
    private readonly contactSourceStatusService: ContactSourceStatusService
  ) {}

  @Get()
  async getContactSourceStatuses(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data =
        await this.contactSourceStatusService.getContactSourcesStatus(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CONTACT_SOURCE_STATUS_CONTROLLER :: GET_CONTACT_SOURCE_STATUSES : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
