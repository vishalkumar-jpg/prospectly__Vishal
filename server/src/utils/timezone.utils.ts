/** Deprecated IANA IDs still returned by browsers or legacy data. */
const IANA_ALIASES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Europe/Kiev": "Europe/Kyiv",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Godthab": "America/Nuuk",
  "Pacific/Samoa": "Pacific/Pago_Pago",
};

const UTC_INPUT_ALIASES = new Set([
  "utc",
  "etc/utc",
  "etc/gmt",
  "gmt",
  "greenwich mean time",
  "coordinated universal time",
]);

function isValidIanaTimezone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

function normalizeIana(timeZone: string): string {
  const trimmed = timeZone.trim();
  const aliased = IANA_ALIASES[trimmed] ?? trimmed;
  if (UTC_INPUT_ALIASES.has(aliased.toLowerCase())) {
    return "UTC";
  }
  return aliased;
}

/** True when the string is a valid IANA zone (e.g. from Google Calendar or the booking UI). */
export function isIanaTimezone(timeZone: string | null | undefined): boolean {
  if (!timeZone?.trim()) return false;
  const normalized = normalizeIana(timeZone.trim());
  return normalized.includes("/") && isValidIanaTimezone(normalized);
}

/**
 * Resolve IANA timezone names for dayjs (browser picker, Google Calendar settings).
 * Non-IANA values (e.g. Microsoft mailbox Windows names) return UTC — use API/event fields instead.
 */
export function resolveTimezoneForDayjs(timeZone: string): string {
  if (!timeZone?.trim()) return "UTC";

  const trimmed = timeZone.trim();
  if (UTC_INPUT_ALIASES.has(trimmed.toLowerCase())) return "UTC";

  if (!trimmed.includes("/")) return "UTC";

  const normalized = normalizeIana(trimmed);
  return isValidIanaTimezone(normalized) ? normalized : "UTC";
}

/**
 * IANA zone for booking display and Google Calendar (prospect picker + Google organizer settings).
 */
export function resolveBookingCalendarTimezone(
  bookingDisplayTimezone?: string | null,
  organizerTimezone?: string | null
): string {
  const bookingRaw = bookingDisplayTimezone?.trim();
  if (bookingRaw) {
    const booking = resolveTimezoneForDayjs(bookingRaw);
    if (booking !== "UTC") return booking;
  }
  return resolveEventTimezoneForGraph(
    organizerTimezone,
    bookingDisplayTimezone
  );
}

/** Pick organizer IANA timezone; fall back to prospect picker when organizer zone is unknown. */
export function resolveEventTimezoneForGraph(
  organizerTimezone?: string | null,
  bookingDisplayTimezone?: string | null
): string {
  const organizerRaw = organizerTimezone?.trim() || "UTC";
  const organizer = resolveTimezoneForDayjs(organizerRaw);
  const bookingRaw = bookingDisplayTimezone?.trim();
  const booking = bookingRaw ? resolveTimezoneForDayjs(bookingRaw) : null;

  const organizerUnknown =
    !organizerTimezone?.trim() ||
    UTC_INPUT_ALIASES.has(organizerRaw.toLowerCase()) ||
    organizer === "UTC";

  if (organizerUnknown && booking && booking !== "UTC") {
    return booking;
  }

  return organizer;
}

/**
 * Timezone for a specific email recipient: resolve IANA input and avoid
 * showing UTC when the meeting was scheduled in a known zone.
 */
export function resolveRecipientDisplayTimezone(
  rawTimezone: string | undefined | null,
  eventTimezone: string
): string {
  const eventIana = resolveTimezoneForDayjs(eventTimezone);
  if (!rawTimezone?.trim()) return eventIana;
  const resolved = resolveTimezoneForDayjs(rawTimezone);
  if (resolved === "UTC" && eventIana !== "UTC") return eventIana;
  return resolved;
}
