/**
 * Integer display/parse helpers for money inputs.
 * Global dollar amounts (fees, bounty) always use en-US (e.g. 200,000).
 * Salary amounts use currency-aware grouping via formatSalaryInteger.
 */

import { getSalaryCurrencyLocale } from "@/lib/salary-currency";

/** Comma, space, NBSP, narrow NBSP — salary grouping separators across locales. */
const SALARY_GROUPING = /[,\s\u00A0\u202F]/g;

/** Display value for global (USD fee/bounty) inputs: empty when 0, else "200,000". */
export function formatIntegerWithCommas(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "";
  return Math.trunc(Math.abs(value)).toLocaleString("en-US");
}

/**
 * Salary input display with currency-aware grouping.
 * INR → 1,00,000; ZAR → 100 000; USD/PHP/MXN → 100,000.
 */
export function formatSalaryInteger(
  value: number,
  currency?: string | null
): string {
  if (!Number.isFinite(value) || value === 0) return "";
  return Math.trunc(Math.abs(value)).toLocaleString(
    getSalaryCurrencyLocale(currency)
  );
}

/**
 * Parse a comma-grouped non-negative integer (global fees/bounty).
 * Returns null for invalid syntax.
 */
export function parseFormattedInteger(raw: string): number | null {
  const normalized = raw.replace(/,/g, "").trim();
  if (!/^\d+$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Parse a salary integer allowing locale grouping (commas and spaces).
 * Returns null for invalid syntax.
 */
export function parseSalaryInteger(raw: string): number | null {
  const normalized = raw.replace(SALARY_GROUPING, "").trim();
  if (!/^\d+$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Clamp a global formatted raw string into [0, max].
 * Empty → 0. Invalid → null.
 */
export function clampFormattedInteger(raw: string, max: number): number | null {
  if (raw.replace(/,/g, "").trim() === "") return 0;
  const parsed = parseFormattedInteger(raw);
  if (parsed === null) return null;
  return Math.min(max, Math.max(0, parsed));
}

/**
 * Clamp a salary formatted raw string into [0, max].
 * Empty → 0. Invalid → null.
 */
export function clampSalaryInteger(raw: string, max: number): number | null {
  if (raw.replace(SALARY_GROUPING, "").trim() === "") return 0;
  const parsed = parseSalaryInteger(raw);
  if (parsed === null) return null;
  return Math.min(max, Math.max(0, parsed));
}
