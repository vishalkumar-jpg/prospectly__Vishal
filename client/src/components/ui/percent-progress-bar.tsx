import * as React from "react";

import { cn } from "@/lib/utils";

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export interface PercentProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  markerPercent?: number | null;
  indicatorClassName?: string;
  markerClassName?: string;
}

const PercentProgressBar = React.forwardRef<HTMLDivElement, PercentProgressBarProps>(
  (
    {
      className,
      value,
      markerPercent,
      indicatorClassName,
      markerClassName,
      ...props
    },
    ref
  ) => {
    const fillPercent = clampPercent(value);
    const markerPosition =
      markerPercent != null ? clampPercent(markerPercent) : null;

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2 overflow-hidden rounded-md bg-muted",
          className
        )}
        {...props}
      >
        <div
          className={cn("h-full rounded-md", indicatorClassName)}
          style={{ width: `${fillPercent}%` }}
        />
        {markerPosition != null && (
          <span
            className={cn(
              "absolute top-0 bottom-0 w-0.5 bg-foreground/35",
              markerClassName
            )}
            style={{ left: `${markerPosition}%` }}
          />
        )}
      </div>
    );
  }
);
PercentProgressBar.displayName = "PercentProgressBar";

export { PercentProgressBar };
