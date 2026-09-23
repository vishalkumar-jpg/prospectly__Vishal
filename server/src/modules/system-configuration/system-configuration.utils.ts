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
    const { days } = value as { days: unknown };
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
 * Parse in_review_reminder_days. Accepts integer ≥ 1 as number, string, or `{ days: N }`.
 * Returns null when missing or invalid — cron must not send reminders in that case.
 */
function parseInReviewReminderDaysInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 1) {
    return Number.isInteger(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed >= 1 && Number.isInteger(parsed)) {
      return parsed;
    }
    return null;
  }

  if (typeof value === "object" && value !== null && "days" in value) {
    return parseInReviewReminderDaysInt((value as { days: unknown }).days);
  }

  return null;
}

export function parseInReviewReminderDays(value: unknown): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    try {
      return parseInReviewReminderDays(JSON.parse(trimmed));
    } catch {
      return parseInReviewReminderDaysInt(trimmed);
    }
  }

  return parseInReviewReminderDaysInt(value);
}
