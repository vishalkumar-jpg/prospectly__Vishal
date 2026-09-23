export const SALARY_CURRENCIES = ["USD", "INR", "ZAR", "PHP", "MXN"] as const;

export type SalaryCurrencyCode = (typeof SALARY_CURRENCIES)[number];

export const SALARY_CURRENCY_OPTIONS: ReadonlyArray<{
  code: SalaryCurrencyCode;
  label: string;
}> = [
  { code: "USD", label: "USD ($)" },
  { code: "INR", label: "INR (₹)" },
  { code: "ZAR", label: "ZAR (R)" },
  { code: "PHP", label: "PHP (₱)" },
  { code: "MXN", label: "MXN (MX$)" },
];

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

/** Display symbol for salary inputs and labels. MXN uses MX$ to distinguish from USD. */
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
 * True only for a complete, ordered salary range. Mirrors the server contract
 * (both bounds positive, max strictly greater than min), so display gates hide
 * partial or malformed data instead of rendering `$0 – $120,000` / `$100 – $100`.
 */
export function isValidSalaryRange(min: number, max: number): boolean {
  return Number.isFinite(min) && Number.isFinite(max) && min > 0 && max > min;
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
