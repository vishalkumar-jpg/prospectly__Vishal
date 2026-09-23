import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Res,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "decorators/current-user.decorator";
import { Public } from "decorators/public.decorator";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { toUTC } from "utils/dayjs";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { CalendarService } from "./calendar.service";
import { ProcessCallbackDto } from "./calendar.dto";
import { CALENDAR_MESSAGES } from "./calendar.constants";

@ApiTags(ApiTagsEnum.Calendar)
@Controller("calendar")
export class CalendarController {
  private readonly logger = new Logger(CalendarController.name);

  constructor(
    @Inject(CalendarService) private readonly calendarService: CalendarService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get("connect/google")
  async connectGoogle(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const authUrl = this.calendarService.getAuthUrl(userId);
      return responseUtils.success(res, { data: { authUrl } });
    } catch (error) {
      this.logger.error(
        `CALENDAR_CONTROLLER :: CONNECT_GOOGLE : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @Post("auth/google/process-callback")
  async processGoogleCallback(
    @Res() res: Response,
    @Body() body: ProcessCallbackDto
  ) {
    try {
      const { code, state } = body;
      await this.calendarService.handleCallback(code, state);
      return responseUtils.success(res, {
        data: {
          success: true,
          message: CALENDAR_MESSAGES.INFO.CALENDAR_CONNECTED,
        },
      });
    } catch (error) {
      this.logger.error(
        `CALENDAR_CONTROLLER :: PROCESS_GOOGLE_CALLBACK : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post("events")
  async createEvent(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() event: AnyType
  ) {
    try {
      const createdEvent = await this.calendarService.createEvent(
        userId,
        event
      );
      return responseUtils.success(res, { data: { event: createdEvent } });
    } catch (error) {
      this.logger.error(
        `CALENDAR_CONTROLLER :: CREATE_EVENT : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get("integrations")
  async getIntegrations(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const integrations =
        await this.calendarService.getUserCalendarIntegrations(userId);

      // Map email to providerEmail for frontend compatibility
      const data = integrations.map((integration) => ({
        id: integration.id,
        provider: integration.provider,
        providerEmail: integration.email || null,
        isActive: integration.isActive,
        createdAt: integration.createdAt,
        syncError:
          integration.tokenExpiresAt &&
          toUTC(integration.tokenExpiresAt) < toUTC()
            ? "Token expired. Please reconnect your calendar."
            : undefined,
      }));
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CALENDAR_CONTROLLER :: GET_INTEGRATIONS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete("integrations/:id")
  @ApiParam({ name: "id", description: "Calendar integration ID" })
  async disconnectIntegration(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") integrationId: string
  ) {
    try {
      const data = await this.calendarService.disconnectIntegration(
        userId,
        integrationId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CALENDAR_CONTROLLER :: DISCONNECT_INTEGRATION : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  // Microsoft Calendar Endpoints
  @UseGuards(JwtAuthGuard)
  @Get("connect/microsoft")
  async connectMicrosoft(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const authUrl = this.calendarService.getMicrosoftAuthUrl(userId);
      return responseUtils.success(res, { data: { authUrl } });
    } catch (error) {
      this.logger.error(
        `CALENDAR_CONTROLLER :: CONNECT_MICROSOFT : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @Post("auth/microsoft/process-callback")
  async processMicrosoftCallback(
    @Res() res: Response,
    @Body() body: ProcessCallbackDto
  ) {
    try {
      const { code, state } = body;
      await this.calendarService.handleMicrosoftCallback(code, state);
      return responseUtils.success(res, {
        data: {
          success: true,
          message: CALENDAR_MESSAGES.INFO.MICROSOFT_CONNECTED,
        },
      });
    } catch (error) {
      this.logger.error(
        `CALENDAR_CONTROLLER :: PROCESS_MICROSOFT_CALLBACK : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
