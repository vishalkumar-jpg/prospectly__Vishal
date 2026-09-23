import { Injectable, Logger } from "@nestjs/common";
import { ScheduledMeeting } from "database/schema";
import { CalendarService } from "modules/calendar/calendar.service";
import {
  extractTeamsMeetingLink,
  MICROSOFT_EVENT_LINK_SELECT,
} from "modules/calendar/microsoft/microsoft-account.utils";
import {
  determineStatusFromScheduledMeeting,
  isMicrosoftTeamsMeetingLink,
} from "modules/calendar/microsoft/microsoft-graph-datetime.utils";
import { MicrosoftMeetingsEmailService } from "./microsoft-meetings-email.service";
import { MicrosoftMeetingsAccountHandlerService } from "./microsoft-meetings-account-handler.service";
import { MEETING_STATUS, MEETINGS_MESSAGES } from "../meetings.constants";
import { MeetingStatusCounts } from "../meetings.types";

@Injectable()
export class MicrosoftMeetingsProcessorService {
  private readonly logger = new Logger(MicrosoftMeetingsProcessorService.name);

  constructor(
    private readonly calendarService: CalendarService,
    private readonly emailService: MicrosoftMeetingsEmailService,
    private readonly accountHandler: MicrosoftMeetingsAccountHandlerService
  ) {}

  async processMicrosoftMeeting(
    meeting: ScheduledMeeting,
    counts: MeetingStatusCounts
  ): Promise<void> {
    let { meetingLink } = meeting;

    if (!meetingLink && meeting.calendarEventId) {
      const fetchedEvent = await this.calendarService.getMicrosoftCalendarEvent(
        meeting.requesterId,
        meeting.calendarEventId,
        MICROSOFT_EVENT_LINK_SELECT
      );
      meetingLink = extractTeamsMeetingLink(fetchedEvent);
      if (meetingLink) {
        await this.calendarService.updateScheduledMeeting(meeting.id, {
          meetingLink,
        });
        this.logger.log(
          `[Microsoft Cron] Recovered meeting link from calendar event for meeting ${meeting.id}`
        );
      }
    }

    const useDbTimeOnly =
      !!meetingLink && !isMicrosoftTeamsMeetingLink(meetingLink);

    if (!meetingLink && !meeting.calendarEventId) {
      this.logger.warn(
        `[Microsoft Cron] Skipping meeting ${meeting.id}: no meeting link and no calendar event`
      );
      return;
    }

    if (!meetingLink && meeting.calendarEventId) {
      this.logger.warn(
        `[Microsoft Cron] Meeting ${meeting.id} has calendar event but no Teams link; will use DB time if personal`
      );
    }

    if (useDbTimeOnly) {
      this.logger.warn(
        `[Microsoft Cron] Meeting ${meeting.id} has non-Teams link (${meetingLink}), using scheduled_meetings time only`
      );
    }

    const meetingWithLink = { ...meeting, meetingLink: meetingLink || "" };

    if (meetingLink) {
      this.logger.log(
        `[Microsoft Cron] Processing meeting ${meeting.id} with link: ${meetingLink}`
      );
    }

    const integration = await this.calendarService.getActiveCalendarIntegration(
      meeting.requesterId
    );

    if (!integration || integration.provider !== "microsoft") {
      this.logger.error(
        MEETINGS_MESSAGES.ERROR.MICROSOFT_INTEGRATION_MISSING(
          meeting.requesterId,
          meeting.id
        )
      );
      return;
    }

    let newStatus: (typeof MEETING_STATUS)[keyof typeof MEETING_STATUS] | null =
      null;

    if (useDbTimeOnly) {
      newStatus = determineStatusFromScheduledMeeting(meeting);
    } else {
      const { userEmail, isPersonalAccount } =
        await this.emailService.determineAccountTypeAndEmail(
          integration,
          meeting
        );

      this.logger.log(
        `[Microsoft Cron] Account type: ${isPersonalAccount ? "Personal" : "Work/School"}${userEmail ? ` (${userEmail})` : " (email unknown)"}`
      );

      if (isPersonalAccount) {
        newStatus = await this.accountHandler.processPersonalAccountMeeting(
          meetingWithLink,
          userEmail || "unknown",
          integration
        );
      } else {
        newStatus = await this.accountHandler.processWorkSchoolAccountMeeting(
          meetingWithLink,
          userEmail,
          integration
        );
      }
    }

    if (!newStatus) {
      return;
    }

    if (newStatus === MEETING_STATUS.COMPLETED) {
      counts.completed++;
    } else if (newStatus === MEETING_STATUS.ONGOING) {
      counts.ongoing++;
    } else {
      counts.notStarted++;
    }

    if (newStatus !== meeting.status) {
      await this.accountHandler.updateMeetingStatus(meeting, newStatus);

      if (newStatus === MEETING_STATUS.COMPLETED) {
        await this.accountHandler.handleMeetingCompletion(meeting);
      }
    }
  }
}
