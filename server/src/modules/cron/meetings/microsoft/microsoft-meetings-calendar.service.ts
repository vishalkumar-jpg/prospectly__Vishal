import { Injectable, Logger } from "@nestjs/common";
import { ScheduledMeeting } from "database/schema";
import { CalendarService } from "modules/calendar/calendar.service";
import { toUTC } from "utils/dayjs";
import {
  getUtcDayRangeAroundMeeting,
  microsoftGraphReadHeaders,
  parseCalendarDateTimeToUtc,
} from "modules/calendar/microsoft/microsoft-graph-datetime.utils";
import {
  MEETING_STATUS,
  MICROSOFT_API_ENDPOINTS,
  MEETINGS_MESSAGES,
} from "../meetings.constants";
import { MicrosoftCalendarEvent } from "../meetings.types";

@Injectable()
export class MicrosoftMeetingsCalendarService {
  private readonly logger = new Logger(MicrosoftMeetingsCalendarService.name);

  constructor(private readonly calendarService: CalendarService) {}

  async fetchMicrosoftCalendarEvent(
    meeting: ScheduledMeeting,
    accessToken: string,
    integration?: { id: string; email: string | null }
  ): Promise<MicrosoftCalendarEvent | null> {
    try {
      let eventUrl: string;

      if (meeting.calendarEventId) {
        eventUrl = `${MICROSOFT_API_ENDPOINTS.GRAPH_API_BASE}/me/events/${meeting.calendarEventId}`;
      } else {
        const { startIso, endIso } = getUtcDayRangeAroundMeeting(
          meeting.meetingDate
        );

        const params = new URLSearchParams({
          startDateTime: startIso,
          endDateTime: endIso,
          $select:
            "id,subject,start,end,isCancelled,isAllDay,onlineMeeting,location,organizer",
        });

        eventUrl = `${MICROSOFT_API_ENDPOINTS.GRAPH_API_BASE}/me/calendarView?${params.toString()}`;
      }

      this.logger.log(`[Microsoft Cron] Fetching calendar event: ${eventUrl}`);

      const response = await fetch(eventUrl, {
        headers: microsoftGraphReadHeaders(accessToken),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          MEETINGS_MESSAGES.ERROR.MICROSOFT_CALENDAR_EVENT_FETCH_FAILED(
            response.status,
            errorText,
            meeting.id,
            meeting.calendarEventId || undefined,
            eventUrl
          )
        );
        return null;
      }

      const data = await response.json();
      let eventWithEmail: MicrosoftCalendarEvent | null = null;

      if (Array.isArray(data.value)) {
        const events = data.value as MicrosoftCalendarEvent[];

        if (meeting.meetingLink) {
          const matchingEvent = events.find((e) => {
            const eventData = e as MicrosoftCalendarEvent & {
              onlineMeeting?: { joinUrl?: string };
              location?: { displayName?: string; locationUri?: string };
            };
            return (
              eventData.onlineMeeting?.joinUrl === meeting.meetingLink ||
              eventData.location?.locationUri === meeting.meetingLink ||
              (eventData.location?.displayName &&
                eventData.location.displayName.includes(meeting.meetingLink))
            );
          });

          if (matchingEvent) {
            eventWithEmail = matchingEvent;
          }
        }

        if (!eventWithEmail) {
          eventWithEmail = events[0] || null;
        }

        if (eventWithEmail && integration && !integration.email) {
          const organizerEmail = (
            eventWithEmail as MicrosoftCalendarEvent & {
              organizer?: { emailAddress?: { address?: string } };
            }
          ).organizer?.emailAddress?.address;
          if (organizerEmail) {
            this.logger.log(
              `[Microsoft Cron] Extracted email from calendar event organizer: ${organizerEmail}`
            );
            await this.calendarService.updateIntegrationEmail(
              meeting.requesterId,
              "microsoft",
              organizerEmail
            );
            this.logger.log(
              `[Microsoft Cron] Successfully saved email ${organizerEmail} to integration ${integration.id}`
            );
          }
        }

        return eventWithEmail;
      }

      const singleEvent = data as MicrosoftCalendarEvent;

      if (singleEvent && integration && !integration.email) {
        const organizerEmail = (
          singleEvent as MicrosoftCalendarEvent & {
            organizer?: { emailAddress?: { address?: string } };
          }
        ).organizer?.emailAddress?.address;
        if (organizerEmail) {
          this.logger.log(
            `[Microsoft Cron] Extracted email from calendar event organizer: ${organizerEmail}`
          );
          await this.calendarService.updateIntegrationEmail(
            meeting.requesterId,
            "microsoft",
            organizerEmail
          );
          this.logger.log(
            `[Microsoft Cron] Successfully saved email ${organizerEmail} to integration ${integration.id}`
          );
        }
      }

      return singleEvent;
    } catch (error) {
      this.logger.error(
        MEETINGS_MESSAGES.ERROR.MICROSOFT_API_CALL_FAILED(
          `fetch calendar event for meeting ${meeting.id}`,
          error instanceof Error ? error.message : String(error)
        )
      );
      return null;
    }
  }

  async getMeetingStatusFromCalendar(
    meeting: ScheduledMeeting,
    accessToken: string,
    integration?: { id: string; email: string | null }
  ): Promise<(typeof MEETING_STATUS)[keyof typeof MEETING_STATUS] | null> {
    const event = await this.fetchMicrosoftCalendarEvent(
      meeting,
      accessToken,
      integration
    );
    if (!event) return null;
    return this.resolveMeetingStatusFromCalendarEvent(event, meeting);
  }

  /**
   * Compare calendar event start/end (parsed to UTC via Prefer UTC) with now.
   * Returns null when end time cannot be parsed so callers fall back to scheduled_meetings UTC.
   */
  resolveMeetingStatusFromCalendarEvent(
    event: MicrosoftCalendarEvent,
    meeting: ScheduledMeeting
  ): (typeof MEETING_STATUS)[keyof typeof MEETING_STATUS] | null {
    const now = toUTC();
    const endDateTime = parseCalendarDateTimeToUtc(event.end);
    const startDateTime = parseCalendarDateTimeToUtc(event.start);

    if (!endDateTime) {
      this.logger.warn(
        `[Microsoft Cron] Could not parse event times to UTC for meeting ${meeting.id} (start.tz=${event.start?.timeZone ?? "n/a"}, end.tz=${event.end?.timeZone ?? "n/a"}); using scheduled_meetings fallback`
      );
      return null;
    }

    if (event.isCancelled === true) {
      return MEETING_STATUS.NOT_STARTED;
    }

    if (endDateTime < now) {
      return MEETING_STATUS.COMPLETED;
    }

    if (startDateTime && startDateTime <= now && endDateTime > now) {
      return MEETING_STATUS.ONGOING;
    }

    return MEETING_STATUS.NOT_STARTED;
  }
}
