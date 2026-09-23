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
import { Public } from "decorators/public.decorator";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { ConfirmMeetingBookingDto } from "./meeting.dto";
import { MeetingService } from "./meeting.service";
import { MeetingCompletionService } from "./meeting-completion.service";
import { RescheduleMeetingService } from "./reschedule-meeting.service";

@ApiTags(ApiTagsEnum.IntroductionRequests)
@Controller("introduction-requests")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MeetingController {
  private readonly logger = new Logger(MeetingController.name);

  constructor(
    @Inject(MeetingService)
    private readonly meetingService: MeetingService,
    @Inject(MeetingCompletionService)
    private readonly meetingCompletionService: MeetingCompletionService,
    @Inject(RescheduleMeetingService)
    private readonly rescheduleMeetingService: RescheduleMeetingService
  ) {}

  @Public()
  @Get("booking/:requestId/:bookingToken/availability")
  async getBookingAvailability(
    @Res() res: Response,
    @Param("requestId") requestId: string,
    @Param("bookingToken") bookingToken: string
  ) {
    try {
      const data = await this.meetingService.getBookingAvailability(
        requestId,
        bookingToken
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `MEETING_CONTROLLER :: GET_BOOKING_AVAILABILITY : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @Post("booking/:requestId/:bookingToken/confirm")
  async confirmMeetingBooking(
    @Res() res: Response,
    @Param("requestId") requestId: string,
    @Param("bookingToken") bookingToken: string,
    @Body()
    bookingData: ConfirmMeetingBookingDto
  ) {
    try {
      const data = await this.meetingService.confirmMeetingBooking(
        requestId,
        bookingToken,
        bookingData
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `MEETING_CONTROLLER :: CONFIRM_MEETING_BOOKING : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post(":id/acknowledge-completion")
  async acknowledgeMeetingCompletion(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") requestId: string
  ) {
    try {
      const data =
        await this.meetingCompletionService.acknowledgeMeetingCompletion(
          userId,
          requestId
        );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `MEETING_CONTROLLER :: ACKNOWLEDGE_MEETING_COMPLETION : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post(":id/meeting/reschedule")
  async rescheduleMeeting(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") requestId: string
  ) {
    try {
      const data = await this.rescheduleMeetingService.rescheduleMeeting(
        userId,
        requestId
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `MEETING_CONTROLLER :: RESCHEDULE_MISSED_MEETING : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
