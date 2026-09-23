import { format, formatDistanceToNow } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { isIndianUser } from "./dateFormatter";
import { toUTC } from "@/lib/dayjs";

/**
 * Gets the user's local timezone using the browser's Intl API
 * @returns The user's timezone string (e.g., "America/New_York", "Asia/Kolkata")
 */
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
};

/**
 * Gets the locale-appropriate date format string for date-fns
 * India: "d MMMM yyyy" (3 December 2025)
 * US/Others: "MMMM d, yyyy" (December 3, 2025)
 */
export const getLocalizedDateFormat = (): string => {
  return isIndianUser() ? "d MMMM yyyy" : "MMMM d, yyyy";
};

/**
 * Gets the locale-appropriate date-time format string for date-fns
 * India: "d MMMM yyyy h:mm a" (3 December 2025 4:30 PM)
 * US/Others: "MMMM d, yyyy h:mm a" (December 3, 2025 4:30 PM)
 */
export const getLocalizedDateTimeFormat = (): string => {
  return isIndianUser() ? "d MMMM yyyy h:mm a" : "MMMM d, yyyy h:mm a";
};

/**
 * Gets the locale-appropriate short date format string for date-fns
 * India: "d MMM yyyy" (3 Dec 2025)
 * US/Others: "MMM d, yyyy" (Dec 3, 2025)
 */
export const getLocalizedShortDateFormat = (): string => {
  return isIndianUser() ? "d MMM yyyy" : "MMM d, yyyy";
};

/**
 * Gets the locale-appropriate short date-time format string for date-fns
 * India: "d MMM yyyy h:mm a" (3 Dec 2025 4:30 PM)
 * US/Others: "MMM d, yyyy h:mm a" (Dec 3, 2025 4:30 PM)
 */
export const getLocalizedShortDateTimeFormat = (): string => {
  return isIndianUser() ? "d MMM yyyy h:mm a" : "MMM d, yyyy h:mm a";
};

/**
 * Parses various date string formats to a consistent local Date object
 * @param input - Date string, Date object, or null/undefined
 * @returns Date object or null if invalid
 */
export const parseToLocalDate = (input?: string | Date | null): Date | null => {
  if (!input) return null;
  if (input instanceof Date) return input;

  try {
    let s = String(input).trim();
    // Ensure ISO T separator
    s = s.replace(" ", "T");
    // If no timezone info, assume UTC to avoid double local interpretation
    const hasTZ = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
    if (!hasTZ) s = `${s}Z`;
    const d = toUTC(s);
    return isNaN(d.getTime()) ? null : d;
  } catch (error) {
    return null;
  }
};

/**
 * Formats a date string consistently across the application (locale-aware)
 * Handles various date formats and ensures consistent output
 * @param dateInput - Date string, Date object, or null/undefined
 * @param formatString - Optional custom format string (defaults to locale-appropriate format)
 * @returns Formatted date string or empty string if invalid
 */
export const formatMeetingDate = (
  dateInput?: string | Date | null,
  formatString?: string
): string => {
  if (!dateInput) return "";

  try {
    const parsed = parseToLocalDate(dateInput);
    if (!parsed) return "";

    // Use provided format string or default to locale-appropriate format
    const finalFormat = formatString || getLocalizedShortDateTimeFormat();
    return format(parsed, finalFormat);
  } catch (error) {
    return "";
  }
};

/**
 * Formats a meeting datetime in the user's local timezone (locale-aware)
 * This function takes an ISO datetime string and formats it in the user's local timezone,
 * ensuring users in different countries see the correct local time
 *
 * @param isoDateTime - ISO datetime string (e.g., "2025-11-27T14:00:00.000Z")
 * @param formatString - Optional custom format string (defaults to locale-appropriate format)
 * @returns Formatted date string in user's local timezone, or empty string if invalid
 */
export const formatMeetingDateInLocalTimezone = (
  isoDateTime?: string | null,
  formatString?: string
): string => {
  if (!isoDateTime) return "";

  try {
    const userTimezone = getUserTimezone();
    // Use provided format string or default to locale-appropriate format
    const finalFormat = formatString || getLocalizedShortDateTimeFormat();
    // formatInTimeZone converts the UTC time to the specified timezone and formats it
    return formatInTimeZone(toUTC(isoDateTime), userTimezone, finalFormat);
  } catch (error) {
    // Fallback to basic formatting
    return formatMeetingDate(isoDateTime, formatString);
  }
};

/**
 * Manual mapping of IANA timezone names to friendly abbreviations
 * JavaScript's Intl API often returns "GMT+X" format instead of friendly names
 * This mapping provides user-friendly timezone abbreviations
 */
const TIMEZONE_ABBREVIATIONS: Record<string, string> = {
  // India
  "Asia/Kolkata": "IST",
  "Asia/Calcutta": "IST",

  // United States
  "America/New_York": "ET",
  "America/Chicago": "CT",
  "America/Denver": "MT",
  "America/Los_Angeles": "PT",
  "America/Phoenix": "MST",
  "America/Anchorage": "AKST",
  "Pacific/Honolulu": "HST",

  // Europe
  "Europe/London": "GMT",
  "Europe/Paris": "CET",
  "Europe/Berlin": "CET",
  "Europe/Madrid": "CET",
  "Europe/Rome": "CET",
  "Europe/Amsterdam": "CET",
  "Europe/Brussels": "CET",
  "Europe/Vienna": "CET",
  "Europe/Warsaw": "CET",
  "Europe/Prague": "CET",
  "Europe/Stockholm": "CET",
  "Europe/Oslo": "CET",
  "Europe/Copenhagen": "CET",
  "Europe/Helsinki": "EET",
  "Europe/Athens": "EET",
  "Europe/Istanbul": "TRT",
  "Europe/Moscow": "MSK",

  // Asia Pacific
  "Asia/Dubai": "GST",
  "Asia/Singapore": "SGT",
  "Asia/Hong_Kong": "HKT",
  "Asia/Tokyo": "JST",
  "Asia/Seoul": "KST",
  "Asia/Shanghai": "CST",
  "Asia/Bangkok": "ICT",
  "Asia/Jakarta": "WIB",
  "Asia/Manila": "PHT",
  "Asia/Kuala_Lumpur": "MYT",
  "Asia/Taipei": "CST",
  "Asia/Ho_Chi_Minh": "ICT",
  "Asia/Karachi": "PKT",
  "Asia/Dhaka": "BST",
  "Asia/Colombo": "IST",

  // Australia & New Zealand
  "Australia/Sydney": "AEST",
  "Australia/Melbourne": "AEST",
  "Australia/Brisbane": "AEST",
  "Australia/Perth": "AWST",
  "Australia/Adelaide": "ACST",
  "Pacific/Auckland": "NZST",

  // Middle East & Africa
  "Africa/Johannesburg": "SAST",
  "Africa/Cairo": "EET",
  "Africa/Lagos": "WAT",
  "Africa/Nairobi": "EAT",
  "Asia/Jerusalem": "IST",
  "Asia/Riyadh": "AST",

  // Americas (non-US)
  "America/Toronto": "ET",
  "America/Vancouver": "PT",
  "America/Mexico_City": "CST",
  "America/Sao_Paulo": "BRT",
  "America/Buenos_Aires": "ART",
  "America/Lima": "PET",
  "America/Bogota": "COT",
  "America/Santiago": "CLT",
};

/**
 * Gets the short timezone abbreviation (e.g., "IST", "EST", "PST")
 * First checks manual mapping, then falls back to Intl API
 * @param date - Date object to get timezone for
 * @param timezone - IANA timezone string (e.g., "Asia/Kolkata")
 * @returns Short timezone abbreviation
 */
const getTimezoneAbbreviation = (date: Date, timezone: string): string => {
  try {
    // First check our manual mapping for friendly abbreviations
    if (TIMEZONE_ABBREVIATIONS[timezone]) {
      return TIMEZONE_ABBREVIATIONS[timezone];
    }

    // Fallback to Intl API (may return GMT+X format for some timezones)
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    });

    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((part) => part.type === "timeZoneName");
    return tzPart?.value || "";
  } catch (error) {
    return "";
  }
};

/**
 * Formats a meeting datetime with timezone indicator (locale-aware)
 * Shows both the time and the timezone abbreviation for clarity
 * Uses friendly abbreviations like "IST", "EST", "PST" instead of "GMT+5:30"
 *
 * @param isoDateTime - ISO datetime string
 * @returns Formatted string like "3 Dec 2025 7:30 PM (IST)" for India or "Dec 3, 2025 7:30 PM (IST)" for US
 */
export const formatMeetingDateWithTimezone = (
  isoDateTime?: string | null
): string => {
  if (!isoDateTime) return "";

  try {
    const userTimezone = getUserTimezone();
    const date = toUTC(isoDateTime);

    // Use locale-appropriate format
    const formatString = getLocalizedShortDateTimeFormat();

    // Format the date/time without timezone
    const formattedDateTime = formatInTimeZone(
      date,
      userTimezone,
      formatString
    );

    // Get the friendly timezone abbreviation (IST, EST, PST, etc.)
    const tzAbbr = getTimezoneAbbreviation(date, userTimezone);

    return tzAbbr ? `${formattedDateTime} (${tzAbbr})` : formattedDateTime;
  } catch (error) {
    return formatMeetingDate(isoDateTime);
  }
};

/**
 * Formats last activity timestamp - shows both relative time AND absolute date/time (locale-aware)
 * @param timestamp - Raw timestamp string
 * @param relativeString - Pre-calculated relative time string (e.g., "2 hours ago")
 * @returns Formatted string with both relative and absolute time
 */
export const formatLastActivity = (
  timestamp?: string | null,
  relativeString?: string
): string => {
  if (!timestamp) {
    return relativeString || "";
  }

  try {
    const activityDate = parseToLocalDate(timestamp);
    if (!activityDate) {
      return relativeString || "";
    }

    const relative =
      relativeString || formatDistanceToNow(activityDate, { addSuffix: true });
    const absolute = formatMeetingDate(timestamp);

    // Return both relative and absolute time
    return `${relative} (${absolute})`;
  } catch (error) {
    return relativeString || "";
  }
};

/**
 * Formats a date in locale-appropriate format for date range pickers
 * India: "3 Dec 2025"
 * US/Others: "Dec 3, 2025"
 */
export const formatDateForPicker = (date: Date): string => {
  try {
    return format(date, getLocalizedShortDateFormat());
  } catch (error) {
    return "";
  }
};

/**
 * Formats a date range in locale-appropriate format
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted range like "3 Dec - 10 Dec 2025" for India or "Dec 3 - Dec 10, 2025" for US
 */
export const formatDateRange = (startDate: Date, endDate: Date): string => {
  try {
    const isIndia = isIndianUser();

    if (startDate.getFullYear() === endDate.getFullYear()) {
      if (isIndia) {
        return `${format(startDate, "d MMM")} - ${format(endDate, "d MMM yyyy")}`;
      } else {
        return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
      }
    }

    if (isIndia) {
      return `${format(startDate, "d MMM yyyy")} - ${format(endDate, "d MMM yyyy")}`;
    } else {
      return `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`;
    }
  } catch (error) {
    return "";
  }
};
