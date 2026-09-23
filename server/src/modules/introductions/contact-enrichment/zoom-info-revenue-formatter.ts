function formatScaledDollarAmount(
  num: number,
  divisor: number,
  suffix: string
): string {
  const scaled = num / divisor;
  const label =
    scaled % 1 === 0 ? String(scaled) : scaled.toFixed(2).replace(/\.?0+$/, "");
  return `$${label}${suffix}`;
}

/**
 * Formats ZoomInfo-style company revenue strings for display.
 * Examples: "$5 mil. - $10 mil." → "$5 M - $10 M", "Under $500,000" → "Under $500K"
 */
export function formatZoomInfoCompanyRevenue(revenue: string): string {
  const trimmed = revenue.trim();
  if (!trimmed) return revenue;

  let result = trimmed.replace(/\bmil\./gi, "M").replace(/\bbil\./gi, "B");

  result = result.replace(/\$([\d,]+)/g, (_, numStr: string) => {
    const num = parseInt(numStr.replace(/,/g, ""), 10);
    if (Number.isNaN(num)) return `$${numStr}`;

    if (num >= 1_000_000_000) {
      return formatScaledDollarAmount(num, 1_000_000_000, "B");
    }
    if (num >= 1_000_000) {
      return formatScaledDollarAmount(num, 1_000_000, "M");
    }
    if (num >= 1_000) {
      return formatScaledDollarAmount(num, 1_000, "K");
    }
    return `$${numStr}`;
  });

  return result;
}
