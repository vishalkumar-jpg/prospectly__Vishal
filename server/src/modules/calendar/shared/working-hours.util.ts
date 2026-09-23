import { dayjs } from "utils/dayjs";
import { resolveTimezoneForDayjs } from "utils/timezone.utils";

/**
 * Generic per-user working hours used to generate bookable meeting slots.
 * Anchored to `timezone`; slots are produced as absolute instants (UTC ISO
 * strings) so any viewer can render them in their own timezone.
 */
export interface WorkingHours {
  start: string; // "HH:mm" (30-min aligned)
  end: string; // "HH:mm"
  timezone: string; // IANA, e.g. "Asia/Kolkata"
}

export interface BusyPeriod {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
}

export const DEFAULT_WORKING_HOURS_START = "09:00";
export const DEFAULT_WORKING_HOURS_END = "17:00";
export const SLOT_DURATION_MINUTES = 30;

interface WorkingHoursConfigInput {
  workingHoursStart?: string | null;
  workingHoursEnd?: string | null;
  workingHoursTimezone?: string | null;
}

/**
 * Resolve effective working hours from a `user_configurations` row, filling in
 * defaults (09:00-17:00) when the columns are null. Falls back to
 * `fallbackTimezone` (then UTC) when no timezone has been configured.
 */
export function resolveWorkingHours(
  config: WorkingHoursConfigInput | null | undefined,
  fallbackTimezone = "UTC"
): WorkingHours {
  return {
    start: config?.workingHoursStart || DEFAULT_WORKING_HOURS_START,
    end: config?.workingHoursEnd || DEFAULT_WORKING_HOURS_END,
    timezone: config?.workingHoursTimezone || fallbackTimezone || "UTC",
  };
}

function parseHm(value: string): number | null {
  // Times must be 30-minute aligned ("HH:00" or "HH:30") per the module contract.
  const match = /^([01]\d|2[0-3]):(00|30)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isSlotBusy(
  slotStart: dayjs.Dayjs,
  slotEnd: dayjs.Dayjs,
  busyPeriods: BusyPeriod[]
): boolean {
  return busyPeriods.some(
    (busy) =>
      (slotStart.isSameOrAfter(busy.start) && slotStart.isBefore(busy.end)) ||
      (slotEnd.isAfter(busy.start) && slotEnd.isSameOrBefore(busy.end)) ||
      (slotStart.isSameOrBefore(busy.start) && slotEnd.isSameOrAfter(busy.end))
  );
}

/**
 * Generate 30-minute bookable slots within the working hours for the next
 * `days` days (Mon-Fri only). Slots in the past or overlapping a busy period
 * are excluded. Returns UTC ISO strings.
 */
export function generateSlotsFromHours(
  hours: WorkingHours,
  days: number,
  busyPeriods: BusyPeriod[],
  now: dayjs.Dayjs
): Array<{ start: string; end: string }> {
  const startMinutes = parseHm(hours.start);
  const endMinutes = parseHm(hours.end);
  if (startMinutes === null || endMinutes === null) return [];
  if (endMinutes <= startMinutes) return [];

  const tz = resolveTimezoneForDayjs(hours.timezone || "UTC");
  const slots: Array<{ start: string; end: string }> = [];

  for (let i = 0; i < days; i++) {
    const cursor = now
      .tz(tz)
      .startOf("day")
      .add(1 + i, "day");
    const dayOfWeek = cursor.day();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends

    const dateKey = cursor.format("YYYY-MM-DD");

    for (
      let minutes = startMinutes;
      minutes + SLOT_DURATION_MINUTES <= endMinutes;
      minutes += SLOT_DURATION_MINUTES
    ) {
      const hh = Math.floor(minutes / 60)
        .toString()
        .padStart(2, "0");
      const mm = (minutes % 60).toString().padStart(2, "0");
      const slotStart = dayjs.tz(`${dateKey} ${hh}:${mm}:00`, tz);
      const slotEnd = slotStart.add(SLOT_DURATION_MINUTES, "minute");

      if (!slotStart.isAfter(now)) continue;
      if (isSlotBusy(slotStart, slotEnd, busyPeriods)) continue;

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
      });
    }
  }

  return slots;
}

/**
 * True iff `slot` is one of the slots `generateSlotsFromHours` would currently
 * produce — used at booking-confirm time to re-validate a candidate's choice
 * against the recruiter's hours and live busy times (closes the race where a
 * slot becomes busy or falls outside the window between fetch and confirm).
 */
export function isSlotWithinHours(
  hours: WorkingHours,
  slot: { start: string; end: string },
  busyPeriods: BusyPeriod[],
  now: dayjs.Dayjs,
  days = 14
): boolean {
  const slotStartMs = dayjs(slot.start).valueOf();
  const slotEndMs = dayjs(slot.end).valueOf();
  return generateSlotsFromHours(hours, days, busyPeriods, now).some(
    (candidate) =>
      dayjs(candidate.start).valueOf() === slotStartMs &&
      dayjs(candidate.end).valueOf() === slotEndMs
  );
}
