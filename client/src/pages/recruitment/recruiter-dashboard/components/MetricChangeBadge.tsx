import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetricWithChange } from "../types";

type MetricChangeBadgeProps = {
  metric: MetricWithChange;
  invertColors?: boolean;
  comparisonLabel?: string;
};

export function MetricChangeBadge({
  metric,
  invertColors = false,
  comparisonLabel = "vs previous period",
}: MetricChangeBadgeProps) {
  if (metric.changePct == null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        No prior data
      </span>
    );
  }

  const isFlat = metric.direction === "flat";
  const isGood =
    !isFlat &&
    (invertColors ? metric.direction === "down" : metric.direction === "up");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        isFlat
          ? "text-muted-foreground"
          : isGood
            ? "text-brand-success"
            : "text-brand-rose"
      )}
    >
      {metric.direction === "up" ? (
        <ArrowUp className="h-3 w-3" />
      ) : metric.direction === "down" ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <Minus className="h-3 w-3" />
      )}
      {Math.abs(metric.changePct)}% {comparisonLabel}
    </span>
  );
}
