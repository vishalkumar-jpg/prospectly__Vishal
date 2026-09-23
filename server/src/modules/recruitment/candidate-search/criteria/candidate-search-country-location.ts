import { sql, type SQL } from "drizzle-orm";
import {
  PAYOUT_COUNTRY_CONFIG,
  SUPPORTED_PAYOUT_COUNTRIES,
  type PayoutCountryCode,
} from "config/payment.config";
import type { FitSignalState } from "../candidate-search.response";

/** Extra tokens matched in free-text location strings (token-boundary regex). */
const COUNTRY_LOCATION_ALIASES: Record<PayoutCountryCode, readonly string[]> = {
  US: ["USA", "U.S.", "U.S.A."],
  IN: [],
  PH: [],
  MX: [],
  ZA: [],
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countryTokens(code: PayoutCountryCode): readonly string[] {
  const name = PAYOUT_COUNTRY_CONFIG[code]?.name;
  const extras = COUNTRY_LOCATION_ALIASES[code] ?? [];
  return name ? [name, ...extras] : [...extras];
}

function contactCountryMatches(
  contactCountry: string,
  code: PayoutCountryCode
): boolean {
  const trimmed = contactCountry.trim();
  if (!trimmed) return false;
  if (trimmed.toUpperCase() === code) return true;
  const lower = trimmed.toLowerCase();
  return countryTokens(code).some((token) => token.toLowerCase() === lower);
}

/**
 * Bounds that still match aliases ending in punctuation (`U.S.`, `U.S.A.`).
 * `\b` / `\M` sit after a word char, so a trailing `.` never sees an end-bound.
 */
function jsTokenBoundaryPattern(token: string): RegExp {
  return new RegExp(`(?<!\\w)${escapeRegex(token)}(?!\\w)`, "i");
}

function pgTokenBoundaryPattern(token: string): string {
  return `(^|[^[:alnum:]_])${escapeRegex(token)}([^[:alnum:]_]|$)`;
}

function locationContainsToken(location: string, token: string): boolean {
  return jsTokenBoundaryPattern(token).test(location);
}

/** True when the candidate location column or CRM country matches the code. */
export function locationMatchesCountry(
  location: string | null | undefined,
  contactCountry: string | null | undefined,
  code: string
): boolean {
  if (!(SUPPORTED_PAYOUT_COUNTRIES as readonly string[]).includes(code)) {
    return false;
  }
  const payoutCode = code as PayoutCountryCode;

  if (
    contactCountry?.trim() &&
    contactCountryMatches(contactCountry, payoutCode)
  ) {
    return true;
  }

  const loc = location?.trim();
  if (!loc) return false;
  return countryTokens(payoutCode).some((token) =>
    locationContainsToken(loc, token)
  );
}

function buildSingleCountryLocationPredicate(code: PayoutCountryCode): SQL {
  const parts: SQL[] = [sql`upper(btrim(contact_country)) = ${code}`];

  for (const token of countryTokens(code)) {
    parts.push(sql`lower(btrim(contact_country)) = lower(${token})`);
    parts.push(sql`location ~* ${pgTokenBoundaryPattern(token)}`);
  }

  return sql`(${sql.join(parts, sql` OR `)})`;
}

/** SQL OR across selected payout country codes (pipeline `location` + `contact_country`). */
export function buildCountryLocationPredicate(codes: string[]): SQL | null {
  const valid = codes.filter((code): code is PayoutCountryCode =>
    (SUPPORTED_PAYOUT_COUNTRIES as readonly string[]).includes(code)
  );
  if (valid.length === 0) return null;

  const parts = valid.map((code) => buildSingleCountryLocationPredicate(code));
  return sql`(${sql.join(parts, sql` OR `)})`;
}

export function countryFacetState(
  wanted: readonly string[],
  location: string | null,
  contactCountry: string | null
): FitSignalState {
  if (wanted.length === 0) return "unknown";
  const checkable = !!(location?.trim() || contactCountry?.trim());
  if (!checkable) return "unknown";
  return wanted.some((code) =>
    locationMatchesCountry(location, contactCountry, code)
  )
    ? "met"
    : "missing";
}

/** One FILTER clause per supported country for facet counts. */
export function buildCountryFacetCountSelect(): SQL {
  const parts = SUPPORTED_PAYOUT_COUNTRIES.map(
    (code) =>
      sql`count(*) FILTER (WHERE ${buildSingleCountryLocationPredicate(code)})::int AS ${sql.raw(`country_${code.toLowerCase()}`)}`
  );
  return sql.join(parts, sql`, `);
}
