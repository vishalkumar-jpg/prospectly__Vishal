import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  Logger,
} from "@nestjs/common";
import { RequireModule } from "decorators/require-module.decorator";
import { Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { Public } from "decorators/public.decorator";
import { SkipCSRF } from "decorators/skip-csrf.decorator";
import responseUtils from "utils/response.utils";
import {
  InterviewBookingAvailabilityService,
  InterviewBookingConfirmService,
} from "./services";
import {
  InterviewBookingParamDto,
  ConfirmInterviewBookingDto,
} from "./interview-booking.dto";
import { RecruitmentNotificationsDispatchService } from "../notifications/services/recruitment-notifications-dispatch.service";

@RequireModule("recruiting")
@Controller("recruitment/interview-booking")
export class InterviewBookingController {
  private readonly logger = new Logger(InterviewBookingController.name);

  constructor(
    private readonly availabilityService: InterviewBookingAvailabilityService,
    private readonly confirmService: InterviewBookingConfirmService,
    private readonly notificationsDispatch: RecruitmentNotificationsDispatchService
  ) {}

  @Public()
  @SkipCSRF()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get(":candidateId/:token/availability")
  async getAvailability(
    @Param() params: InterviewBookingParamDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.availabilityService.getAvailability(
        params.candidateId,
        params.token
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `INTERVIEW_BOOKING_CONTROLLER :: GET_AVAILABILITY : ERROR : ${error}`
      );
      void this.notificationsDispatch
        .dispatchInterviewBookingError({
          candidateId: params.candidateId,
          error,
          stage: "availability",
        })
        .catch((notifyErr) =>
          this.logger.error(
            `INTERVIEW_BOOKING_CONTROLLER :: NOTIFY_RECRUITER : ERROR : ${notifyErr}`
          )
        );
      return responseUtils.error({ res, error });
    }
  }

  @Public()
  @SkipCSRF()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(":candidateId/:token/confirm")
  async confirmBooking(
    @Param() params: InterviewBookingParamDto,
    @Body() dto: ConfirmInterviewBookingDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.confirmService.confirmBooking(
        params.candidateId,
        params.token,
        dto
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `INTERVIEW_BOOKING_CONTROLLER :: CONFIRM_BOOKING : ERROR : ${error}`
      );
      void this.notificationsDispatch
        .dispatchInterviewBookingError({
          candidateId: params.candidateId,
          error,
          stage: "confirmation",
        })
        .catch((notifyErr) =>
          this.logger.error(
            `INTERVIEW_BOOKING_CONTROLLER :: NOTIFY_RECRUITER : ERROR : ${notifyErr}`
          )
        );
      return responseUtils.error({ res, error });
    }
  }
}
