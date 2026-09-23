/** Funnel % — show decimals when rounded integer would hide a non-zero stage. */
export function formatFunnelPercent(value: number, total: number): string {
  if (total <= 0 || value <= 0) return "0";
  const pct = (value / total) * 100;
  if (pct > 0 && pct < 1) {
    const twoDecimals = parseFloat(pct.toFixed(2));
    return twoDecimals > 0 ? twoDecimals.toString() : "0.01";
  }
  return String(Math.round(pct));
}
