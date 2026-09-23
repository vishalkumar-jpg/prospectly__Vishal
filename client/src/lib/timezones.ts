import { dayjs } from "@/lib/dayjs";

export interface TimezoneOption {
  value: string;
  label: string;
}

/**
 * Curated major IANA timezones with human descriptors. Offsets are intentionally
 * NOT stored here — they are computed live (see `timezoneLabel`) so DST months
 * show the correct GMT offset instead of a hardcoded standard-time value.
 */
const MAJOR_TIMEZONE_DESCRIPTORS: Array<{ value: string; descriptor: string }> =
  [
    { value: "Pacific/Honolulu", descriptor: "Hawaii - Honolulu" },
    { value: "America/Anchorage", descriptor: "Alaska - Anchorage" },
    { value: "America/Los_Angeles", descriptor: "Pacific - Los Angeles" },
    { value: "America/Denver", descriptor: "Mountain - Denver" },
    { value: "America/Chicago", descriptor: "Central - Chicago" },
    { value: "America/New_York", descriptor: "Eastern - New York" },
    { value: "America/Mexico_City", descriptor: "Mexico - Mexico City" },
    { value: "America/Sao_Paulo", descriptor: "Brasilia - Sao Paulo" },
    { value: "UTC", descriptor: "UTC" },
    { value: "Europe/London", descriptor: "London" },
    { value: "Europe/Paris", descriptor: "Paris" },
    { value: "Europe/Berlin", descriptor: "Berlin" },
    { value: "Europe/Athens", descriptor: "Athens" },
    { value: "Europe/Moscow", descriptor: "Moscow" },
    { value: "Asia/Dubai", descriptor: "Dubai" },
    { value: "Asia/Kolkata", descriptor: "India - Kolkata" },
    { value: "Asia/Manila", descriptor: "Philippines - Manila" },
    { value: "Asia/Bangkok", descriptor: "Bangkok" },
    { value: "Asia/Shanghai", descriptor: "Shanghai" },
    { value: "Asia/Singapore", descriptor: "Singapore" },
    { value: "Asia/Tokyo", descriptor: "Tokyo" },
    { value: "Africa/Johannesburg", descriptor: "South Africa - Johannesburg" },
    { value: "Australia/Sydney", descriptor: "Sydney" },
    { value: "Pacific/Auckland", descriptor: "Auckland" },
  ];

/** Browsers may return deprecated IANA IDs not listed above. */
const IANA_TIMEZONE_ALIASES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Europe/Kiev": "Europe/Kyiv",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "US/Eastern": "America/New_York",
  "US/Central": "America/Chicago",
  "US/Mountain": "America/Denver",
  "US/Pacific": "America/Los_Angeles",
  "US/Hawaii": "Pacific/Honolulu",
  "US/Alaska": "America/Anchorage",
};

export function canonicalMajorTimezone(iana: string): string {
  return IANA_TIMEZONE_ALIASES[iana] ?? iana;
}

/** Live, DST-aware GMT offset label (e.g. "(GMT-04:00)") for a zone. */
function formatGmtOffsetLabelForIana(iana: string): string {
  try {
    const canonical = canonicalMajorTimezone(iana);
    const d = dayjs().tz(canonical);
    if (!d.isValid()) return "";
    const z = d.utcOffset();
    const sign = z >= 0 ? "+" : "-";
    const total = Math.abs(z);
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    return `(GMT${sign}${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")})`;
  } catch {
    return "";
  }
}

function descriptorForTimezone(iana: string): string {
  const canonical = canonicalMajorTimezone(iana);
  const found = MAJOR_TIMEZONE_DESCRIPTORS.find((t) => t.value === canonical);
  if (found) return found.descriptor;
  return canonical.includes("/")
    ? (canonical.split("/").pop() ?? canonical).replace(/_/g, " ")
    : canonical;
}

/**
 * Full display label with a live (DST-aware) GMT offset,
 * e.g. "(GMT-04:00) Eastern - New York".
 */
export function timezoneLabel(iana: string): string {
  const offset = formatGmtOffsetLabelForIana(iana);
  const descriptor = descriptorForTimezone(iana);
  return offset ? `${offset} ${descriptor}` : descriptor;
}

// Back-compat aliases — both now resolve the GMT offset live.
export const majorTimezoneLabel = timezoneLabel;
export const descriptiveTimezoneLabel = timezoneLabel;

/** Curated timezone options with live-offset labels, for dropdowns. */
export function getMajorTimezoneOptions(): TimezoneOption[] {
  return MAJOR_TIMEZONE_DESCRIPTORS.map((t) => ({
    value: t.value,
    label: timezoneLabel(t.value),
  }));
}

/** Browser-detected timezone, canonicalised to a known IANA id. */
export function detectBrowserTimezone(): string {
  try {
    return canonicalMajorTimezone(
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    );
  } catch {
    return "UTC";
  }
}

/** Recruiter interview-invite dialog default: always the current system/browser zone. */
export function resolveRecruiterInterviewTimezone(): string {
  return detectBrowserTimezone();
}
