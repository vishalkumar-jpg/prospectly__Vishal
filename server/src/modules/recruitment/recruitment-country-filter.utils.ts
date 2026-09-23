import { sql, type SQL } from "drizzle-orm";
import { isSupportedPayoutCountry } from "config/payment.config";

/** URL token when the client intentionally selects zero countries. */
export const COUNTRY_FILTER_NONE_QUERY = "none";

/** Internal sentinel returned by {@link parseCountriesQueryParam}. */
export const COUNTRY_FILTER_NONE_SENTINEL = "__NONE__";

/** Normalize and dedupe country codes from a query param (array or comma-separated). */
export function parseCountriesQueryParam(
  countries?: string[] | string
): string[] {
  const raw = Array.isArray(countries)
    ? countries
    : typeof countries === "string"
      ? countries.split(",")
      : [];

  const tokens = raw.map((code) => String(code).trim());
  if (
    tokens.some((token) => token.toLowerCase() === COUNTRY_FILTER_NONE_QUERY)
  ) {
    return [COUNTRY_FILTER_NONE_SENTINEL];
  }

  const normalized = tokens
    .map((code) => code.toUpperCase())
    .filter(isSupportedPayoutCountry);

  return [...new Set(normalized)];
}

/** Job matches when its `countries` JSONB array overlaps any selected code. */
export function countriesJsonbOverlapCondition(
  column: unknown,
  countries: string[]
): SQL | undefined {
  if (countries.includes(COUNTRY_FILTER_NONE_SENTINEL)) {
    return sql`false`;
  }
  if (!countries.length) return undefined;

  return sql`${column} ?| array[${sql.join(
    countries.map((code) => sql`${code}`),
    sql`, `
  )}]::text[]`;
}
