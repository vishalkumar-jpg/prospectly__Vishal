import { Injectable, Logger } from "@nestjs/common";
import { ScheduledMeeting } from "database/schema";
import * as schema from "database/schema";
import { CalendarService } from "modules/calendar/calendar.service";
import { BountyStagesService } from "modules/bounty-stages/bounty-stages.service";
import { IntroductionsService } from "modules/introductions/introductions.service";
import { determineStatusFromScheduledMeeting } from "modules/calendar/microsoft/microsoft-graph-datetime.utils";
import { MicrosoftMeetingsTokenService } from "./microsoft-meetings-token.service";
import { MicrosoftMeetingsOnlineApiService } from "./microsoft-meetings-online-api.service";
import { MicrosoftMeetingsCalendarService } from "./microsoft-meetings-calendar.service";
import { MEETING_STATUS, MEETINGS_MESSAGES } from "../meetings.constants";

@Injectable()
export class MicrosoftMeetingsAccountHandlerService {
  private readonly logger = new Logger(
    MicrosoftMeetingsAccountHandlerService.name
  );

  constructor(
    private readonly calendarService: CalendarService,
    private readonly bountyStagesService: BountyStagesService,
    private readonly introductionsService: IntroductionsService,
    private readonly tokenService: MicrosoftMeetingsTokenService,
    private readonly onlineApiService: MicrosoftMeetingsOnlineApiService,
    private readonly calendarEventService: MicrosoftMeetingsCalendarService
  ) {}

  async processPersonalAccountMeeting(
    meeting: ScheduledMeeting,
    userEmail: string,
    integration?: { id: string; email: string | null } | null
  ): Promise<(typeof MEETING_STATUS)[keyof typeof MEETING_STATUS] | null> {
    const tokens = await this.calendarService.getMicrosoftTokens(
      meeting.requesterId
    );
    if (!tokens) {
      this.logger.error(
        MEETINGS_MESSAGES.ERROR.MICROSOFT_INTEGRATION_MISSING(
          meeting.requesterId,
          meeting.id
        )
      );
      return null;
    }

    const accessToken = await this.tokenService.getValidMicrosoftAccessToken(
      tokens,
      meeting.requesterId
    );
    if (!accessToken) {
      this.logger.error(
        `❌ [Microsoft Cron] Failed to obtain valid access token for Personal account meeting ${meeting.id} (user: ${meeting.requesterId}, email: ${userEmail}). Token refresh may have failed.`
      );
      return null;
    }

    const integrationForEmail =
      integration ??
      (await this.calendarService.getActiveCalendarIntegration(
        meeting.requesterId
      ));

    const status = await this.calendarEventService.getMeetingStatusFromCalendar(
      meeting,
      accessToken,
      integrationForEmail ?? undefined
    );
    if (status) {
      return status;
    }

    this.logger.warn(
      `[Microsoft Cron] Calendar event not found for personal meeting ${meeting.id}, using scheduled_meetings time fallback`
    );
    return determineStatusFromScheduledMeeting(meeting);
  }

  async processWorkSchoolAccountMeeting(
    meeting: ScheduledMeeting,
    userEmail: string | null,
    integration?: { id: string; email: string | null } | null
  ): Promise<(typeof MEETING_STATUS)[keyof typeof MEETING_STATUS] | null> {
    const tokens = await this.calendarService.getMicrosoftTokens(
      meeting.requesterId
    );

    let delegatedToken: string | null = null;

    if (tokens) {
      delegatedToken = await this.tokenService.getValidMicrosoftAccessToken(
        tokens,
        meeting.requesterId
      );

      if (delegatedToken) {
        this.logger.log(
          `[Microsoft Cron] Attempting OnlineMeetings API with Delegated Token (/me/onlineMeetings)`
        );

        const conferenceData =
          await this.onlineApiService.checkMicrosoftConferenceStatus(
            meeting.meetingLink!,
            delegatedToken,
            userEmail
          );

        if (conferenceData) {
          const onlineMeetingStatus =
            this.onlineApiService.determineMicrosoftMeetingStatus(
              conferenceData.reports,
              conferenceData.meeting
            );
          this.logger.log(
            `[Microsoft Cron] Successfully determined meeting status from Delegated OnlineMeetings API: ${onlineMeetingStatus}`
          );
          return onlineMeetingStatus;
        } else {
          this.logger.warn(
            `[Microsoft Cron] Failed to get meeting details from OnlineMeetings API. Falling back to Calendar Event.`
          );
        }
      } else {
        this.logger.error(
          `❌ [Microsoft Cron] Failed to obtain valid access token for Work/School meeting ${meeting.id}.`
        );
        return null;
      }
    } else {
      this.logger.error(
        MEETINGS_MESSAGES.ERROR.MICROSOFT_INTEGRATION_MISSING(
          meeting.requesterId,
          meeting.id
        )
      );
      return null;
    }

    this.logger.log(
      `[Microsoft Cron] Using Calendar Event fallback for status determination.`
    );

    const integrationForEmail =
      integration ??
      (await this.calendarService.getActiveCalendarIntegration(
        meeting.requesterId
      ));

    const status = await this.calendarEventService.getMeetingStatusFromCalendar(
      meeting,
      delegatedToken,
      integrationForEmail ?? undefined
    );
    if (status) {
      return status;
    }

    this.logger.warn(
      `[Microsoft Cron] Calendar event fallback for work/school meeting ${meeting.id}, using scheduled_meetings time`
    );
    return determineStatusFromScheduledMeeting(meeting);
  }

  async updateMeetingStatus(
    meeting: schema.ScheduledMeeting,
    newStatus: string
  ): Promise<void> {
    await this.calendarService.updateScheduledMeetingStatus(
      meeting.id,
      newStatus
    );
  }

  async handleMeetingCompletion(
    meeting: schema.ScheduledMeeting
  ): Promise<void> {
    if (!meeting.introductionRequestId) {
      return;
    }

    try {
      const meetingCompletedStage =
        await this.bountyStagesService.getBountyStageByStageId(
          "meeting_completed"
        );

      await this.introductionsService.updateIntroductionRequestInDb(
        meeting.introductionRequestId,
        {
          status: "meeting_completed",
          bountyStagesId: meetingCompletedStage?.id || null,
          requesterBountyStagesId: meetingCompletedStage?.id || null,
        }
      );
    } catch (error) {
      this.logger.error(
        MEETINGS_MESSAGES.ERROR.UPDATE_REQUEST_FAILED(
          meeting.introductionRequestId,
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }
}
