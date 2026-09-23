import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Put,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { Public } from "decorators/public.decorator";
import { SkipCSRF } from "decorators/skip-csrf.decorator";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { NotificationPreferencesService } from "./notification-preferences.service";
import {
  OneClickUnsubscribeDto,
  PublicSaveNotificationPreferencesDto,
  SaveNotificationPreferencesDto,
  UnsubscribeQueryDto,
} from "./notification-preferences.dto";

@Controller("notification-preferences")
export class NotificationPreferencesController {
  private readonly logger = new Logger(NotificationPreferencesController.name);

  constructor(
    private readonly preferencesService: NotificationPreferencesService
  ) {}

  @Get("me")
  async getMine(@CurrentUser("userId") userId: string, @Res() res: Response) {
    try {
      const data = await this.preferencesService.getCategoriesForUser(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `NOTIFICATION_PREFERENCES_CONTROLLER :: GET_ME : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Put("me")
  async saveMine(
    @CurrentUser("userId") userId: string,
    @Body() body: SaveNotificationPreferencesDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.preferencesService.saveForUser(userId, body);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `NOTIFICATION_PREFERENCES_CONTROLLER :: SAVE_ME : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @SkipCSRF()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get("public")
  async getPublic(@Query() query: UnsubscribeQueryDto, @Res() res: Response) {
    try {
      const data = await this.preferencesService.getCategoriesForPublic(query);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `NOTIFICATION_PREFERENCES_CONTROLLER :: GET_PUBLIC : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @SkipCSRF()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Put("public")
  async savePublic(
    @Body() body: PublicSaveNotificationPreferencesDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.preferencesService.saveForPublic(body);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `NOTIFICATION_PREFERENCES_CONTROLLER :: SAVE_PUBLIC : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @SkipCSRF()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post("one-click")
  async oneClick(
    @Body() body: OneClickUnsubscribeDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (req.headers["list-unsubscribe"] === "One-Click") {
        await this.preferencesService.oneClickUnsubscribe(body);
        return res.status(200).send("OK");
      }

      const data = await this.preferencesService.oneClickUnsubscribe(body);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `NOTIFICATION_PREFERENCES_CONTROLLER :: ONE_CLICK : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
