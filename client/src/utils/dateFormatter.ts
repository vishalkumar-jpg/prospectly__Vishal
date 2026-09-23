/**
 * Date formatting utilities for consistent, locale-aware date display across the application
 *
 * Formatting Rules:
 * - India: "3 December 2025 4:30 PM" (day before month, no comma)
 * - US/Others: "December 3, 2025 4:30 PM" (month before day, with comma)
 *
 * Database stores dates in standard ISO format - formatting is only for display.
 */

import { AnyType } from "@/types/common";
import { toUTC, utcDayjs } from "@/lib/dayjs";
import { DATE_FORMATS } from "@/constants/date";

/**
 * Detects if the user is from India based on browser timezone or locale
 * @returns true if user appears to be from India
 */
export function isIndianUser(): boolean {
  try {
    // Check timezone first (most reliable)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone === "Asia/Kolkata" || timezone === "Asia/Calcutta") {
      return true;
    }

    // Fallback: check browser language/locale
    const locale =
      navigator.language || (navigator as AnyType).userLanguage || "";
    if (
      locale.toLowerCase().includes("in") ||
      locale === "hi" ||
      locale.startsWith("hi-")
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Gets the user's locale code for formatting
 * @returns 'en-IN' for India, 'en-US' for others
 */
export function getUserLocale(): string {
  return isIndianUser() ? "en-IN" : "en-US";
}

/**
 * Converts a date input to a valid Date object
 * @param date - Date string, Date object, or timestamp
 * @returns Date object or null if invalid
 */
function toDateObject(
  date: string | Date | number | null | undefined
): Date | null {
  if (!date) return null;

  try {
    const dateObj =
      typeof date === "string" || typeof date === "number" ? toUTC(date) : date;

    return isNaN(dateObj.getTime()) ? null : dateObj;
  } catch {
    return null;
  }
}

/**
 * Formats a date and time according to user's location
 * India: "3 December 2025 4:30 PM"
 * US/Others: "December 3, 2025 4:30 PM"
 *
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted date-time string or "Invalid Date" if parsing fails
 */
export function formatLocalizedDateTime(
  date: string | Date | number | null | undefined
): string {
  const dateObj = toDateObject(date);
  if (!dateObj) return "Invalid Date";

  try {
    const isIndia = isIndianUser();

    if (isIndia) {
      // India format: "3 December 2025 4:30 PM"
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString("en-US", { month: "long" });
      const year = dateObj.getFullYear();
      const time = dateObj.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      return `${day} ${month} ${year} ${time}`;
    } else {
      // US/Others format: "December 3, 2025 4:30 PM"
      const month = dateObj.toLocaleDateString("en-US", { month: "long" });
      const day = dateObj.getDate();
      const year = dateObj.getFullYear();
      const time = dateObj.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      return `${month} ${day}, ${year} ${time}`;
    }
  } catch {
    return "Invalid Date";
  }
}

/**
 * Formats only the date portion according to user's location
 * India: "3 December 2025"
 * US/Others: "December 3, 2025"
 *
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted date string or "Invalid Date" if parsing fails
 */
export function formatLocalizedDate(
  date: string | Date | number | null | undefined
): string {
  const dateObj = toDateObject(date);
  if (!dateObj) return "Invalid Date";

  try {
    const isIndia = isIndianUser();

    if (isIndia) {
      // India format: "3 December 2025"
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString("en-US", { month: "long" });
      const year = dateObj.getFullYear();

      return `${day} ${month} ${year}`;
    } else {
      // US/Others format: "December 3, 2025"
      const month = dateObj.toLocaleDateString("en-US", { month: "long" });
      const day = dateObj.getDate();
      const year = dateObj.getFullYear();

      return `${month} ${day}, ${year}`;
    }
  } catch {
    return "Invalid Date";
  }
}

/**
 * Formats date in standard format: "30 Dec 2025"
 * Always uses day month year format regardless of locale
 *
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted date string or "Invalid Date" if parsing fails
 */
export function formatStandardDate(
  date: string | Date | number | null | undefined
): string {
  const dateObj = toDateObject(date);
  if (!dateObj) return "Invalid Date";

  try {
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString("en-US", { month: "short" });
    const year = dateObj.getFullYear();

    return `${day} ${month} ${year}`;
  } catch {
    return "Invalid Date";
  }
}

/**
 * Formats only the date portion with short month according to user's location
 * India: "3 Dec 2025"
 * US/Others: "Dec 3, 2025"
 *
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted date string or "Invalid Date" if parsing fails
 */
export function formatLocalizedShortDate(
  date: string | Date | number | null | undefined
): string {
  const dateObj = toDateObject(date);
  if (!dateObj) return "Invalid Date";

  try {
    const isIndia = isIndianUser();

    if (isIndia) {
      // India format: "3 Dec 2025"
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString("en-US", { month: "short" });
      const year = dateObj.getFullYear();

      return `${day} ${month} ${year}`;
    } else {
      // US/Others format: "Dec 3, 2025"
      const month = dateObj.toLocaleDateString("en-US", { month: "short" });
      const day = dateObj.getDate();
      const year = dateObj.getFullYear();

      return `${month} ${day}, ${year}`;
    }
  } catch {
    return "Invalid Date";
  }
}

/**
 * Formats date and time with short month according to user's location
 * India: "3 Dec 2025 4:30 PM"
 * US/Others: "Dec 3, 2025 4:30 PM"
 *
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted date-time string or "Invalid Date" if parsing fails
 */
export function formatLocalizedShortDateTime(
  date: string | Date | number | null | undefined
): string {
  if (!date) return "Invalid Date";

  try {
    const dayjsDate = utcDayjs(date).local();
    if (!dayjsDate.isValid()) return "Invalid Date";

    const isIndia = isIndianUser();

    if (isIndia) {
      // India format: "3 Dec 2025 4:30 PM"
      return dayjsDate.format(DATE_FORMATS.IN_DATETIME);
    } else {
      // US/Others format: "Dec 3, 2025 4:30 PM"
      return dayjsDate.format(DATE_FORMATS.US_DATETIME);
    }
  } catch {
    return "Invalid Date";
  }
}

/**
 * Splits a localized short date-time into separate date and time parts,
 * using the same timezone handling as formatLocalizedShortDateTime.
 * India: { date: "3 Dec 2025", time: "4:30 PM" }
 * US/Others: { date: "Dec 3, 2025", time: "4:30 PM" }
 *
 * @param date - Date string, Date object, or timestamp
 * @returns { date, time } or null if parsing fails
 */
export function formatLocalizedDateTimeParts(
  date: string | Date | number | null | undefined
): { date: string; time: string } | null {
  if (!date) return null;

  try {
    const dayjsDate = utcDayjs(date).local();
    if (!dayjsDate.isValid()) return null;

    const isIndia = isIndianUser();

    return {
      date: dayjsDate.format(
        isIndia ? DATE_FORMATS.IN_DATE : DATE_FORMATS.US_DATE
      ),
      time: dayjsDate.format("h:mm A"),
    };
  } catch {
    return null;
  }
}

/**
 * Formats a date to just the time portion: "4:30 PM"
 * Time format is the same for all locales
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted time string or "Invalid Time" if parsing fails
 */
export function formatTime(
  date: string | Date | number | null | undefined
): string {
  const dateObj = toDateObject(date);
  if (!dateObj) return "Invalid Time";

  try {
    return dateObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Invalid Time";
  }
}

/**
 * Formats a date as a relative time string: "2 hours ago", "3 days ago"
 * Falls back to localized date-time for dates older than 7 days
 * @param date - Date string, Date object, or timestamp
 * @returns Relative time string or "Invalid Date" if parsing fails
 */
export function formatRelativeTime(
  date: string | Date | number | null | undefined
): string {
  const dateObj = toDateObject(date);
  if (!dateObj) return "Invalid Date";

  try {
    const now = toUTC();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "Just now";
    if (diffMins < 60)
      return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
    if (diffHours < 24)
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    if (diffDays < 7)
      return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;

    // If more than 7 days, use localized date-time format
    return formatLocalizedShortDateTime(dateObj);
  } catch {
    return "Invalid Date";
  }
}

/**
 * Formats a date with relative time and absolute date-time in parentheses
 * Example: "2 hours ago (3 December 2025 4:30 PM)" for India
 * Example: "2 hours ago (December 3, 2025 4:30 PM)" for US
 * @param date - Date string, Date object, or timestamp
 * @returns Combined relative and absolute time string
 */
export function formatRelativeWithAbsolute(
  date: string | Date | number | null | undefined
): string {
  const dateObj = toDateObject(date);
  if (!dateObj) return "Invalid Date";

  try {
    const now = toUTC();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relative: string;
    if (diffSecs < 60) relative = "Just now";
    else if (diffMins < 60)
      relative = `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
    else if (diffHours < 24)
      relative = `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    else if (diffDays < 7)
      relative = `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
    else relative = formatLocalizedShortDateTime(dateObj);

    const absolute = formatLocalizedShortDateTime(dateObj);

    // For recent times (less than 7 days), show both relative and absolute
    if (diffDays < 7) {
      return `${relative} (${absolute})`;
    }

    // For older dates, just show the date-time
    return absolute;
  } catch {
    return "Invalid Date";
  }
}

// Legacy exports for backwards compatibility
// These now use the localized versions internally

/**
 * @deprecated Use formatLocalizedShortDateTime instead
 * Formats a date to the standard application format (locale-aware)
 */
export function formatDateTime(
  date: string | Date | number | null | undefined
): string {
  return formatLocalizedShortDateTime(date);
}

/**
 * @deprecated Use formatLocalizedShortDate instead
 * Formats a date to just the date portion (locale-aware)
 */
export function formatDate(
  date: string | Date | number | null | undefined
): string {
  return formatLocalizedShortDate(date);
}
