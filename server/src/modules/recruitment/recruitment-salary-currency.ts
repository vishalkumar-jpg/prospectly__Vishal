export const SALARY_CURRENCIES = ["USD", "INR", "ZAR", "PHP", "MXN"] as const;

export type SalaryCurrencyCode = (typeof SALARY_CURRENCIES)[number];

export function normalizeSalaryCurrency(
  currency?: string | null
): SalaryCurrencyCode {
  if (currency) {
    const upper = currency.trim().toUpperCase();
    if (SALARY_CURRENCIES.includes(upper as SalaryCurrencyCode)) {
      return upper as SalaryCurrencyCode;
    }
  }
  return "USD";
}

/**
 * Locale used for salary digit grouping.
 * INR → Indian (1,00,000); ZAR → space (100 000); others → Western (100,000).
 */
export function getSalaryCurrencyLocale(currency?: string | null): string {
  switch (normalizeSalaryCurrency(currency)) {
    case "INR":
      return "en-IN";
    case "ZAR":
      return "en-ZA";
    case "PHP":
      return "en-PH";
    case "MXN":
      return "es-MX";
    case "USD":
    default:
      return "en-US";
  }
}

export function getSalaryCurrencySymbol(currency?: string | null): string {
  switch (normalizeSalaryCurrency(currency)) {
    case "INR":
      return "₹";
    case "ZAR":
      return "R";
    case "PHP":
      return "₱";
    case "MXN":
      return "MX$";
    case "USD":
    default:
      return "$";
  }
}

export function formatAmountWithSalaryCurrency(
  amount: number,
  currency?: string | null
): string {
  const symbol = getSalaryCurrencySymbol(currency);
  const n = Number.isFinite(amount) ? Math.trunc(amount) : 0;
  return `${symbol}${n.toLocaleString(getSalaryCurrencyLocale(currency))}`;
}

/**
 * Full min–max salary range with currency-aware grouping (no K/M).
 * e.g. INR: `₹1,00,000 – ₹5,00,000`; USD: `$100,000 – $500,000`.
 */
export function formatCompactSalaryRange(
  min: number,
  max: number,
  currency?: string | null
): string {
  return `${formatAmountWithSalaryCurrency(min, currency)} – ${formatAmountWithSalaryCurrency(max, currency)}`;
}
