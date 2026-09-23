/**
 * Decimal (cents) display/parse helpers for recruitment fee/payout money inputs.
 * Mirrors the API shape of `formatted-integer.ts`, which stays integer-only for
 * salary and day inputs. Amounts are dollars with at most 2 decimal places.
 */

/** Max decimal places a money amount may carry. */
const CENTS_SCALE = 2;

/** Accepts partial input while typing: "", "312", "312.", "312.5", "312.50". */
const DECIMAL_INPUT = /^\d*(\.\d{0,2})?$/;

/**
 * Rounds to cents. Shifts through the decimal string form so half-cent values
 * round up (10.075 -> 10.08) instead of being pulled down by their binary
 * representation. Non-finite input, and input whose string form already uses
 * exponent notation (1e21), fall through unchanged rather than becoming NaN.
 */
export function roundToCents(value: number): number {
  if (!Number.isFinite(value)) return value;

  const shifted = Number(`${value}e+${CENTS_SCALE}`);
  if (!Number.isFinite(shifted)) return value;

  const rounded = Number(`${Math.round(shifted)}e-${CENTS_SCALE}`);
  return Number.isFinite(rounded) ? rounded : value;
}

/** True when `value` is finite and carries no more than 2 decimal places. */
export function isCentPrecise(value: number): boolean {
  return Number.isFinite(value) && roundToCents(value) === value;
}

/**
 * Settled money display with thousands grouping. A whole amount renders without
 * a decimal part ("250", "1,234"); an amount carrying cents always renders both
 * digits ("312.50", never "312.5"). Used for blur normalisation and every
 * read-only fee/payout render. The sign is preserved — a negative amount is a
 * data problem worth surfacing, not something to silently flip.
 */
export function formatMoneyWithCommas(value: number): string {
  const numeric = Number.isFinite(value) ? value : 0;
  const hasCents = !Number.isInteger(roundToCents(numeric));
  return numeric.toLocaleString("en-US", {
    minimumFractionDigits: hasCents ? CENTS_SCALE : 0,
    maximumFractionDigits: CENTS_SCALE,
  });
}

/** `$1,234.50`, or an em dash when the amount is not available yet. */
export function formatMoneyOrDash(value: number | null): string {
  return value !== null ? `$${formatMoneyWithCommas(value)}` : "—";
}

/**
 * Parse a comma-grouped non-negative decimal with at most 2 decimal places.
 * Returns null for invalid syntax so callers can reject the keystroke.
 */
export function parseFormattedDecimal(raw: string): number | null {
  const normalized = raw.replace(/,/g, "").trim();
  if (normalized === "" || normalized === ".") return null;
  if (!DECIMAL_INPUT.test(normalized)) return null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return roundToCents(parsed);
}

/**
 * Clamp a formatted raw string into [0, max], rounded to cents.
 * Empty → 0. Invalid → null.
 */
export function clampFormattedDecimal(raw: string, max: number): number | null {
  if (raw.replace(/,/g, "").trim() === "") return 0;
  const parsed = parseFormattedDecimal(raw);
  if (parsed === null) return null;
  return roundToCents(Math.min(max, Math.max(0, parsed)));
}
