import { utcDayjs } from "@/lib/dayjs";

/**
 * Parse unsuccessful_enabled_time_period config value (days).
 * Accepts: 0, 1, "1", { days: 1 }. Invalid/missing → 0 (no hide window).
 */
export function parseUnsuccessfulEnabledTimePeriodDays(value: unknown): number {
  if (value == null) {
    return 0;
  }

  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.floor(parsed);
    }
    try {
      return parseUnsuccessfulEnabledTimePeriodDays(JSON.parse(trimmed));
    } catch {
      return 0;
    }
  }

  if (typeof value === "object" && value !== null && "days" in value) {
    const days = (value as { days: unknown }).days;
    if (typeof days === "number" && Number.isFinite(days) && days >= 0) {
      return Math.floor(days);
    }
    if (typeof days === "string") {
      const parsed = Number(days);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return Math.floor(parsed);
      }
    }
  }

  return 0;
}

/**
 * Returns true when Mark as Unsuccessful should be hidden (within the grace window).
 */
export function isMarkUnsuccessfulHidden(
  createdAt: string | null | undefined,
  periodDays: number,
  now = utcDayjs()
): boolean {
  if (periodDays <= 0 || !createdAt) {
    return false;
  }

  const hideUntil = utcDayjs(createdAt).add(periodDays, "day");
  return now.isBefore(hideUntil);
}
