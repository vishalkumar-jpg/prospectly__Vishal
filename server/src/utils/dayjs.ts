import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { resolveTimezoneForDayjs } from "utils/timezone.utils";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import customParseFormat from "dayjs/plugin/customParseFormat";
import advancedFormat from "dayjs/plugin/advancedFormat";

// Extend dayjs with required plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);

/**
 * Get current time as UTC dayjs object for fluent API usage
 */
export const utcDayjs = (date?: string | number | Date | dayjs.Dayjs) => {
  return dayjs(date).utc();
};

/**
 * Standard utility to get the current date or transform a date into a UTC Date object.
 */
export const toUTC = (date?: string | number | Date | dayjs.Dayjs) => {
  return utcDayjs(date).toDate();
};

/**
 * Mapping of IANA timezone names to full display labels
 * Matches the MAJOR_TIMEZONES format from frontend
 */
const TIMEZONE_LABELS: Record<string, string> = {
  "Pacific/Honolulu": "Hawaii Standard Time - Honolulu",
  "America/Anchorage": "Alaska Standard Time - Anchorage",
  "America/Los_Angeles": "Pacific Standard Time - Los Angeles",
  "America/Tijuana": "Pacific Standard Time - Tijuana",
  "America/Phoenix": "Mountain Standard Time - Phoenix",
  "America/Denver": "Mountain Standard Time - Denver",
  "America/Mexico_City": "Central Standard Time - Mexico City",
  "America/Chicago": "Central Standard Time - Chicago",
  "America/Cancun": "Eastern Standard Time - Cancun",
  "America/New_York": "Eastern Standard Time - New York",
  "America/Sao_Paulo": "Brasilia Time - Sao Paulo",
  "Atlantic/Azores": "Azores Standard Time",
  UTC: "Coordinated Universal Time - UTC",
  "Europe/London": "Greenwich Mean Time - London",
  "Europe/Paris": "Central European Time - Paris",
  "Europe/Berlin": "Central European Time - Berlin",
  "Europe/Athens": "Eastern European Time - Athens",
  "Europe/Moscow": "Moscow Standard Time",
  "Asia/Dubai": "Gulf Standard Time - Dubai",
  "Asia/Kolkata": "India Standard Time - Kolkata",
  "Asia/Dhaka": "Bangladesh Standard Time - Dhaka",
  "Asia/Bangkok": "Indochina Time - Bangkok",
  "Asia/Shanghai": "China Standard Time - Shanghai",
  "Asia/Hong_Kong": "Hong Kong Time",
  "Asia/Singapore": "Singapore Standard Time",
  "Asia/Tokyo": "Japan Standard Time - Tokyo",
  "Asia/Seoul": "Korea Standard Time - Seoul",
  "Australia/Sydney": "Australian Eastern Time - Sydney",
  "Pacific/Auckland": "New Zealand Standard Time - Auckland",
};

/**
 * Gets the full timezone label (e.g., "(GMT+05:30) India Standard Time - Kolkata")
 * Always uses dynamic offset calculation to handle DST correctly
 * @param tz - IANA timezone string (e.g., "Asia/Kolkata")
 * @returns Full timezone label
 */
export const getTimezoneLabel = (
  tz: string,
  at?: string | number | Date | dayjs.Dayjs
): string => {
  if (!tz) return "";

  const iana = resolveTimezoneForDayjs(tz);

  try {
    // Calculate dynamic offset (handles DST correctly)
    const base = at ? dayjs(at) : dayjs();
    const utcOffset = base.tz(iana).utcOffset();

    const hours = Math.floor(Math.abs(utcOffset) / 60);
    const minutes = Math.abs(utcOffset) % 60;
    const sign = utcOffset >= 0 ? "+" : "-";
    const offsetStr =
      minutes > 0
        ? `${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
        : `${sign}${hours.toString().padStart(2, "0")}:00`;

    // Check manual mapping for human-readable name
    if (TIMEZONE_LABELS[iana]) {
      return `(GMT${offsetStr}) ${TIMEZONE_LABELS[iana]}`;
    }

    // Fallback: generate label from timezone
    return `(GMT${offsetStr}) ${iana.replace(/_/g, " ")}`;
  } catch {
    return iana;
  }
};

export { dayjs };
