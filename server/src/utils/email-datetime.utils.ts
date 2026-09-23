import { utcDayjs } from "utils/dayjs";

const FEEDBACK_EMAIL_DISPLAY_TIMEZONE = "Asia/Kolkata";

/** Formats UTC-stored timestamps for feedback emails in IST. */
export function formatFeedbackEmailDateTime(
  date?: string | number | Date | null
): string {
  if (date === null || date === undefined) return "";
  return utcDayjs(date)
    .tz(FEEDBACK_EMAIL_DISPLAY_TIMEZONE)
    .format("DD MMM YYYY, h:mm A");
}
