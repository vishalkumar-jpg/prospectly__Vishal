import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number in compact format using Intl.NumberFormat (e.g., 1000 → "1K", 1210 → "1.2K", 1000000 → "1M")
 * @param num - The number to format (can be null or undefined)
 * @param locale - The locale to use for formatting (default: 'en')
 * @param options - Additional Intl.NumberFormat options
 * @returns Formatted string representation
 * @example
 * formatCompactNumber(0) // "0"
 * formatCompactNumber(999) // "999"
 * formatCompactNumber(1000) // "1K"
 * formatCompactNumber(1210) // "1.2K"
 * formatCompactNumber(10000) // "10K"
 * formatCompactNumber(12345) // "12.3K"
 * formatCompactNumber(100000) // "100K"
 * formatCompactNumber(1000000) // "1M"
 * formatCompactNumber(1210000) // "1.2M"
 */
export function formatCompactNumber(
  num: number | null | undefined,
  locale: string = "en",
  options: Intl.NumberFormatOptions = {}
): string {
  if (
    num === null ||
    num === undefined ||
    typeof num !== "number" ||
    isNaN(num)
  ) {
    return "0";
  }

  const formatter = new Intl.NumberFormat(locale, {
    notation: "compact",
    compactDisplay: "short", // 'K'/'M' instead of 'thousand'/'million'
    maximumFractionDigits: 1, // 1 decimal (e.g., 1.2K); override in options
    ...options,
  });

  return formatter.format(num);
}
