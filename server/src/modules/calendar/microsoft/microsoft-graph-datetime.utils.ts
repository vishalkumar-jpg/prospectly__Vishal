import { dayjs, toUTC } from "utils/dayjs";
import { isIanaTimezone, resolveTimezoneForDayjs } from "utils/timezone.utils";
import { ScheduledMeeting } from "database/schema";
import { MEETING_STATUS } from "modules/cron/meetings/meetings.constants";

export {
  resolveBookingCalendarTimezone,
  resolveEventTimezoneForGraph,
  resolveRecipientDisplayTimezone,
  resolveTimezoneForDayjs,
} from "utils/timezone.utils";

/** Ask Graph to return event start/end in UTC so we can compare instants without Windows→IANA maps. */
export const MICROSOFT_GRAPH_PREFER_UTC = 'outlook.timezone="UTC"';

export function microsoftGraphReadHeaders(
  accessToken: string
): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Prefer: MICROSOFT_GRAPH_PREFER_UTC,
  };
}

export type CalendarDateTimeField = {
  dateTime?: string;
  timeZone?: string;
};

/**
 * Parse start/end from a calendar API response into a UTC Date.
 * With Prefer UTC, dateTime is UTC; otherwise uses the field's timeZone when it is IANA.
 */
export function parseCalendarDateTimeToUtc(
  field: CalendarDateTimeField | undefined | null
): Date | null {
  if (!field?.dateTime?.trim()) return null;

  const raw = field.dateTime.trim();
  const hasOffset = /[zZ]$/.test(raw) || /[+-]\d{2}:?\d{2}$/.test(raw);

  if (hasOffset) {
    const parsed = dayjs(raw);
    return parsed.isValid() ? toUTC(parsed.toDate()) : null;
  }

  const clean = raw.replace(/\.\d{3,7}/, "");
  const tz = field.timeZone?.trim();

  if (tz && isIanaTimezone(tz)) {
    const parsed = dayjs.tz(clean, resolveTimezoneForDayjs(tz));
    return parsed.isValid() ? toUTC(parsed.toDate()) : null;
  }

  if (tz?.toUpperCase() === "UTC") {
    const parsed = dayjs.utc(clean);
    return parsed.isValid() ? toUTC(parsed.toDate()) : null;
  }

  return null;
}

/** @deprecated Use parseCalendarDateTimeToUtc */
export function parseMicrosoftGraphDateTime(
  dateTime: string | undefined,
  timeZone: string | undefined
): Date | null {
  return parseCalendarDateTimeToUtc({ dateTime, timeZone });
}

/**
 * Build Graph event start/end from a UTC slot instant.
 * - wallClockTimeZone: IANA zone for wall-clock (booking picker or organizer IANA settings).
 * - graphTimeZone: timeZone field on the event (organizer mailbox from API; may be Windows).
 * When the mailbox zone is Windows-only, wall clock uses booking IANA and Graph stores UTC
 * so the instant stays correct without a Windows→IANA map.
 */
export function toMicrosoftGraphDateTime(
  isoUtc: string,
  wallClockTimeZone?: string | null,
  graphTimeZone?: string | null
): { dateTime: string; timeZone: string } {
  const utc = dayjs.utc(isoUtc);
  if (!utc.isValid()) {
    throw new Error(`Invalid UTC datetime for Graph event: ${isoUtc}`);
  }

  const mailboxTz = graphTimeZone?.trim();
  const wallTz = wallClockTimeZone?.trim();

  if (wallTz && isIanaTimezone(wallTz)) {
    const iana = resolveTimezoneForDayjs(wallTz);
    const wall = utc.tz(iana);
    const graphFieldTz =
      mailboxTz && isIanaTimezone(mailboxTz)
        ? resolveTimezoneForDayjs(mailboxTz)
        : iana;
    return {
      dateTime: wall.format("YYYY-MM-DDTHH:mm:ss"),
      timeZone: graphFieldTz,
    };
  }

  const graphFieldTz =
    mailboxTz && !mailboxTz.includes("/") ? "UTC" : mailboxTz || "UTC";

  return {
    dateTime: utc.format("YYYY-MM-DDTHH:mm:ss"),
    timeZone: graphFieldTz,
  };
}

export function toGoogleCalendarDateTime(
  isoUtc: string,
  timeZone: string
): { dateTime: string; timeZone: string } {
  const iana = resolveTimezoneForDayjs(timeZone);
  const wall = dayjs.utc(isoUtc).tz(iana);
  if (!wall.isValid()) {
    throw new Error(`Invalid UTC datetime for Google Calendar: ${isoUtc}`);
  }
  return {
    dateTime: wall.format("YYYY-MM-DDTHH:mm:ss"),
    timeZone: iana,
  };
}

export function getScheduledMeetingTimezone(meeting: ScheduledMeeting): string {
  const metadata = meeting.metadata as { timezone?: string } | null;
  return metadata?.timezone ?? "UTC";
}

/** UTC window around a stored meeting instant for Graph event queries. */
export function getUtcDayRangeAroundMeeting(meetingDate: Date): {
  startIso: string;
  endIso: string;
} {
  const center = dayjs.utc(meetingDate);
  return {
    startIso: center.subtract(1, "day").startOf("day").toISOString(),
    endIso: center.add(1, "day").endOf("day").toISOString(),
  };
}

export function determineStatusFromScheduledMeeting(
  meeting: ScheduledMeeting
): (typeof MEETING_STATUS)[keyof typeof MEETING_STATUS] {
  const now = toUTC();
  const start = meeting.meetingDate ? toUTC(meeting.meetingDate) : null;
  const metadata = meeting.metadata as { endTime?: string } | null;
  const durationMinutes = meeting.meetingDuration ?? 30;
  const end = metadata?.endTime
    ? toUTC(metadata.endTime)
    : start
      ? toUTC(start.getTime() + durationMinutes * 60 * 1000)
      : null;

  if (!start || !end) {
    return MEETING_STATUS.NOT_STARTED;
  }

  if (end < now) {
    return MEETING_STATUS.COMPLETED;
  }
  if (start <= now && end > now) {
    return MEETING_STATUS.ONGOING;
  }
  return MEETING_STATUS.NOT_STARTED;
}

function isAllowedTeamsHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "teams.microsoft.com" ||
    host === "teams.live.com" ||
    host.endsWith(".teams.microsoft.com") ||
    host.endsWith(".teams.live.com")
  );
}

export function isMicrosoftTeamsMeetingLink(
  link: string | null | undefined
): boolean {
  if (!link?.trim()) return false;

  const trimmed = link.trim();
  if (trimmed.toLowerCase().startsWith("msteams:")) {
    return true;
  }

  try {
    const url = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`
    );
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    return isAllowedTeamsHostname(url.hostname);
  } catch {
    return false;
  }
}
