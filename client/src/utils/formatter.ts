/**
 * Formatting utilities for consistent display across the application
 */

import {
  getSalaryCurrencySymbol,
  formatCompactSalaryRange,
  formatAmountWithSalaryCurrency,
} from "@/lib/salary-currency";

/**
 * Formats a number as currency in USD
 * @param amount - The amount to format
 * @param options - Optional formatting options
 * @returns Formatted currency string (e.g., "$1,234")
 */
export function formatCurrency(
  amount: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    currency?: string;
  }
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: options?.currency || "USD",
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(amount);
}

/**
 * Formats a number as currency for badges / cards.
 * Full amount with commas — never K/M (e.g. "$1,200,000").
 */
/** Min–max salary with full amounts (e.g. ₹60,000 – ₹90,000). */
export function formatSalaryRange(
  min: number,
  max: number,
  currency?: string | null
): string {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return "Not disclosed";
  }
  return formatCompactSalaryRange(min, max, currency);
}

export function formatCompactCurrency(
  amount: number,
  currency?: string | null
): string {
  return formatAmountWithSalaryCurrency(amount, currency);
}

export {
  formatCompactSalaryRange,
  isValidSalaryRange,
} from "@/lib/salary-currency";

/**
 * Formats a salary period into a full word
 * @param period - The period (e.g., "yearly", "yr", "monthly", "mo", "weekly", "wk", "we", "hourly", "hr")
 * @returns Full word (yearly, monthly, weekly, hourly)
 */
export function formatSalaryPeriod(period?: string | null): string {
  if (!period) return "";
  const p = period.toLowerCase();
  if (p === "yearly" || p === "yr") return "Yearly";
  if (p === "monthly" || p === "mo") return "Monthly";
  if (p === "weekly" || p === "wk" || p === "we") return "Weekly";
  if (p === "hourly" || p === "hr") return "Hourly";
  return period;
}

/** Turns a month count into a label such as "2 years" or "1 year 3 months". */
export function formatDurationMonths(months: number): string {
  if (!Number.isFinite(months) || months <= 0) return "";
  const total = Math.round(months);
  const years = Math.floor(total / 12);
  const leftover = total % 12;
  const parts: string[] = [];
  if (years === 1) parts.push("1 year");
  else if (years > 1) parts.push(`${years} years`);
  if (leftover === 1) parts.push("1 month");
  else if (leftover > 1) parts.push(`${leftover} months`);
  return parts.join(" ");
}
