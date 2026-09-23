import { cn } from "@/lib/utils";
import { PERCENT_HEIGHT_CLASSES } from "./funnelBarHeightClasses";
import { PERCENT_WIDTH_CLASSES } from "./funnelBarWidthClasses";

function boundPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getFunnelBarPercent(value: number, applied: number): number {
  if (value <= 0 || applied <= 0) return 0;
  return Math.min(100, (value / applied) * 100);
}

/** Tailwind height: exact % when >= 1; tiny min slice when > 0 and < 1%. */
export function getFunnelBarHeightClassName(
  value: number,
  applied: number
): string {
  const pct = getFunnelBarPercent(value, applied);
  if (pct <= 0) return "h-0";
  if (pct < 1) return "h-0 min-h-1";
  return cn("min-h-1", getFunnelBarHeightClass(Math.round(pct)));
}

/** Tailwind width: exact % when >= 1; tiny min slice when > 0 and < 1%. */
export function getFunnelBarWidthClassName(
  value: number,
  applied: number
): string {
  const pct = getFunnelBarPercent(value, applied);
  if (pct <= 0) return "w-0";
  if (pct < 1) return "w-0 min-w-1";
  return cn("min-w-1", getFunnelBarWidthClass(Math.round(pct)));
}

export function getFunnelBarHeightClass(pct: number): string {
  return PERCENT_HEIGHT_CLASSES[boundPercent(pct)];
}

export function getFunnelBarWidthClass(pct: number): string {
  return PERCENT_WIDTH_CLASSES[boundPercent(pct)];
}
