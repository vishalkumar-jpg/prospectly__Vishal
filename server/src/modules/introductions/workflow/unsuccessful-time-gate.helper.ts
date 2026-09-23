import { toUTC, utcDayjs } from "utils/dayjs";

/**
 * Returns true when Mark as Unsuccessful should be hidden (within the grace window).
 * periodDays <= 0 or missing createdAt → never hidden.
 */
export function isMarkUnsuccessfulHidden(
  createdAt: Date | string | null | undefined,
  periodDays: number,
  now: Date = toUTC()
): boolean {
  if (periodDays <= 0 || !createdAt) {
    return false;
  }

  const hideUntil = utcDayjs(createdAt).add(periodDays, "day");
  return utcDayjs(now).isBefore(hideUntil);
}
