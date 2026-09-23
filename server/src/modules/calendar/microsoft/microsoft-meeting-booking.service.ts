import { Injectable, Logger } from "@nestjs/common";
import { isIanaTimezone } from "utils/timezone.utils";
import { MicrosoftCalendarService } from "./microsoft-calendar.service";
import {
  extractTeamsMeetingLink,
  isPersonalMicrosoftAccount,
  MICROSOFT_EVENT_LINK_SELECT,
} from "./microsoft-account.utils";
import { toMicrosoftGraphDateTime } from "./microsoft-graph-datetime.utils";

export interface BookMicrosoftTeamsMeetingInput {
  integrationEmail?: string | null;
  startDateTime: string;
  endDateTime: string;
  subject: string;
  bodyHtml: string;
  timezone: string;
  attendees: Array<{
    emailAddress: { address: string; name: string };
    type: string;
  }>;
}

export interface BookMicrosoftTeamsMeetingResult {
  meetingLink: string | null;
  calendarEventId: string;
}

const EVENT_TIMEZONE_VERIFY_SELECT =
  "start,end,originalStartTimeZone,originalEndTimeZone";

@Injectable()
export class MicrosoftMeetingBookingService {
  private readonly logger = new Logger(MicrosoftMeetingBookingService.name);

  constructor(
    private readonly microsoftCalendarService: MicrosoftCalendarService
  ) {}

  async bookTeamsMeeting(
    userId: string,
    input: BookMicrosoftTeamsMeetingInput
  ): Promise<BookMicrosoftTeamsMeetingResult> {
    const isPersonal = isPersonalMicrosoftAccount(input.integrationEmail);
    this.logger.log(
      `Microsoft Teams booking for user ${userId}: ${isPersonal ? "Personal" : "Work/School"} account`
    );

    const baseEvent = await this.buildBaseEvent(userId, input);
    const bookingContext = {
      start: input.startDateTime,
      end: input.endDateTime,
      bookingTimezone: input.timezone,
      expectedStartTimeZone: baseEvent.start.timeZone as string,
    };

    if (isPersonal) {
      return this.bookViaCalendarEvent(
        userId,
        baseEvent,
        false,
        bookingContext
      );
    }

    const onlineMeeting =
      await this.microsoftCalendarService.createOnlineMeeting(userId, {
        startDateTime: input.startDateTime,
        endDateTime: input.endDateTime,
        subject: input.subject,
      });
    const joinWebUrl = onlineMeeting?.joinWebUrl || null;

    if (joinWebUrl) {
      const createdEvent = await this.microsoftCalendarService.createEvent(
        userId,
        {
          ...baseEvent,
          location: {
            displayName: "Microsoft Teams",
            locationUri: joinWebUrl,
          },
          isOnlineMeeting: false,
        }
      );
      return {
        meetingLink: joinWebUrl,
        calendarEventId: this.requireCalendarEventId(createdEvent),
      };
    }

    return this.bookViaCalendarEvent(userId, baseEvent, true, bookingContext);
  }

  private requireCalendarEventId(createdEvent: AnyType): string {
    const eventId = createdEvent?.id;
    if (!eventId) {
      throw new Error(
        "Microsoft calendar event was created without an event id"
      );
    }
    return eventId;
  }

  private async buildBaseEvent(
    userId: string,
    input: BookMicrosoftTeamsMeetingInput
  ): Promise<AnyType> {
    const mailboxTimeZone =
      await this.microsoftCalendarService.getUserTimezone(userId);
    const wallClockTimeZone = isIanaTimezone(mailboxTimeZone)
      ? mailboxTimeZone
      : isIanaTimezone(input.timezone)
        ? input.timezone
        : null;
    const start = toMicrosoftGraphDateTime(
      input.startDateTime,
      wallClockTimeZone,
      mailboxTimeZone
    );
    const end = toMicrosoftGraphDateTime(
      input.endDateTime,
      wallClockTimeZone,
      mailboxTimeZone
    );
    return {
      subject: input.subject,
      body: { contentType: "HTML", content: input.bodyHtml },
      start: { dateTime: start.dateTime, timeZone: start.timeZone },
      end: { dateTime: end.dateTime, timeZone: end.timeZone },
      attendees: input.attendees,
    };
  }

  private async bookViaCalendarEvent(
    userId: string,
    baseEvent: AnyType,
    useTeamsForBusiness: boolean,
    bookingContext: {
      start: string;
      end: string;
      bookingTimezone: string;
      expectedStartTimeZone: string;
    }
  ): Promise<BookMicrosoftTeamsMeetingResult> {
    const { attendees, ...eventWithoutAttendees } = baseEvent;

    const eventPayload: AnyType = {
      ...eventWithoutAttendees,
      isOnlineMeeting: true,
    };
    if (useTeamsForBusiness) {
      eventPayload.onlineMeetingProvider = "teamsForBusiness";
    }

    const createdEvent = await this.microsoftCalendarService.createEvent(
      userId,
      eventPayload
    );
    let meetingLink = extractTeamsMeetingLink(createdEvent);

    if (!meetingLink && createdEvent.id) {
      meetingLink = await this.pollForMeetingLink(userId, createdEvent.id);
    }

    if (!meetingLink && useTeamsForBusiness) {
      const fallback = await this.microsoftCalendarService.createOnlineMeeting(
        userId,
        {
          startDateTime: bookingContext.start,
          endDateTime: bookingContext.end,
          subject: baseEvent.subject,
        }
      );
      meetingLink = fallback?.joinWebUrl || null;
    }

    if (createdEvent.id) {
      await this.finalizeCalendarEventWithAttendees(
        userId,
        createdEvent.id,
        { start: baseEvent.start, end: baseEvent.end },
        attendees,
        meetingLink,
        bookingContext
      );
    }

    return {
      meetingLink,
      calendarEventId: this.requireCalendarEventId(createdEvent),
    };
  }

  private async finalizeCalendarEventWithAttendees(
    userId: string,
    eventId: string,
    eventTimes: { start: AnyType; end: AnyType },
    attendees: BookMicrosoftTeamsMeetingInput["attendees"] | undefined,
    meetingLink: string | null,
    bookingContext: { bookingTimezone: string; expectedStartTimeZone: string }
  ): Promise<void> {
    const patchBody: AnyType = {};

    if (attendees?.length) {
      patchBody.start = eventTimes.start;
      patchBody.end = eventTimes.end;
      patchBody.attendees = attendees;
    }
    if (meetingLink) {
      patchBody.location = {
        displayName: "Microsoft Teams",
        locationUri: meetingLink,
      };
    }

    if (Object.keys(patchBody).length === 0) {
      return;
    }

    await this.microsoftCalendarService.updateEvent(userId, eventId, patchBody);
    this.logger.log(
      `Microsoft calendar event ${eventId} finalized with ${attendees?.length ?? 0} attendee(s)${meetingLink ? " and Teams link" : ""}`
    );

    if (attendees?.length) {
      await this.verifyEventTimezoneAfterAttendeePatch(
        userId,
        eventId,
        bookingContext
      );
    }
  }

  private async verifyEventTimezoneAfterAttendeePatch(
    userId: string,
    eventId: string,
    bookingContext: { bookingTimezone: string; expectedStartTimeZone: string }
  ): Promise<void> {
    const event = await this.microsoftCalendarService.getEvent(
      userId,
      eventId,
      EVENT_TIMEZONE_VERIFY_SELECT
    );
    if (!event?.start) return;

    if (
      bookingContext.expectedStartTimeZone &&
      event.start.timeZone &&
      event.start.timeZone !== bookingContext.expectedStartTimeZone
    ) {
      this.logger.warn(
        `MICROSOFT_BOOKING :: START_TIMEZONE_DRIFT :: eventId=${eventId} :: expected=${bookingContext.expectedStartTimeZone} :: got=${event.start.timeZone}`
      );
    }
  }

  private async pollForMeetingLink(
    userId: string,
    eventId: string
  ): Promise<string | null> {
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 2500));
      }
      const event = await this.microsoftCalendarService.getEvent(
        userId,
        eventId,
        MICROSOFT_EVENT_LINK_SELECT
      );
      const link = extractTeamsMeetingLink(event);
      if (link) return link;
    }
    return null;
  }
}
