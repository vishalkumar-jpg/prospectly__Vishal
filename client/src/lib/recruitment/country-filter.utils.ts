import { PAYOUT_COUNTRIES } from "@/lib/stripe-connect";

export const COUNTRIES_URL_PARAM = "countries";

/** URL / API token when no countries are selected (matches zero jobs). */
export const COUNTRY_FILTER_NONE_QUERY = "none";

/** Internal sentinel — never a real country code. */
export const COUNTRY_FILTER_NONE = "__NONE__";

/** Supported payout country codes used by the job-country filter UI. */
export const COUNTRY_FILTER_CODES = PAYOUT_COUNTRIES.map(
  (country) => country.value
);

const SUPPORTED_COUNTRY_CODES = new Set<string>(
  PAYOUT_COUNTRIES.map((country) => country.value)
);

/** Parse comma-separated country codes from a URL query value. */
export function isCountryFilterNone(selected: string[]): boolean {
  return selected.length === 1 && selected[0] === COUNTRY_FILTER_NONE;
}

export function parseCountriesFromUrl(
  raw: string | null | undefined
): string[] {
  if (!raw?.trim()) return [];

  const trimmed = raw.trim();
  if (trimmed.toLowerCase() === COUNTRY_FILTER_NONE_QUERY) {
    return [COUNTRY_FILTER_NONE];
  }

  return [
    ...new Set(
      trimmed
        .split(",")
        .map((part) => part.trim().toUpperCase())
        .filter((part) => SUPPORTED_COUNTRY_CODES.has(part))
    ),
  ];
}

/** Serialize selected country codes for the URL (all → omit, none → `none`). */
export function serializeCountriesForUrl(selected: string[]): string {
  if (isCountryFilterNone(selected)) return COUNTRY_FILTER_NONE_QUERY;

  return selected
    .map((code) => code.trim().toUpperCase())
    .filter((code) => SUPPORTED_COUNTRY_CODES.has(code))
    .join(",");
}

/** Value for `countries` query param, or `null` to omit (all regions). */
export function getCountriesQueryValue(selected: string[]): string | null {
  const serialized = serializeCountriesForUrl(selected);
  return serialized || null;
}

export function getCountryLabel(code: string): string {
  return (
    PAYOUT_COUNTRIES.find((country) => country.value === code)?.label ?? code
  );
}

/** Empty selection means no country filter (all regions). */
export function areAllCountriesSelected(selected: string[]): boolean {
  if (isCountryFilterNone(selected)) return false;
  if (selected.length === 0) return true;
  return COUNTRY_FILTER_CODES.every((code) => selected.includes(code));
}

export function areSomeCountriesSelected(selected: string[]): boolean {
  return (
    !isCountryFilterNone(selected) &&
    selected.length > 0 &&
    !areAllCountriesSelected(selected)
  );
}

export function isCountrySelectedInFilter(
  selected: string[],
  code: string
): boolean {
  if (isCountryFilterNone(selected)) return false;
  return areAllCountriesSelected(selected) || selected.includes(code);
}

/** Collapse a full explicit list back to `[]` (no API filter). */
export function normalizeCountryFilterSelection(next: string[]): string[] {
  if (isCountryFilterNone(next)) return [COUNTRY_FILTER_NONE];
  if (next.length === 0) return [COUNTRY_FILTER_NONE];
  if (areAllCountriesSelected(next)) return [];
  return next;
}

export function getCountryFilterTriggerLabel(selected: string[]): string {
  if (isCountryFilterNone(selected)) return "No countries selected";
  if (areAllCountriesSelected(selected)) return "All Countries";

  if (selected.length === 1) return getCountryLabel(selected[0]);

  const labels = selected.map(getCountryLabel);
  if (selected.length === 2) return labels.join(", ");

  return `${labels.slice(0, 2).join(", ")} +${selected.length - 2}`;
}
