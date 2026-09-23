import { cn } from "@/lib/utils";
import type { RecruiterCandidateFunnelResponse } from "../types";
import { getFunnelBarWidthClassName } from "../utils/funnelBarClasses";
import { formatFunnelPercent } from "../utils/formatFunnelPercent";
import {
  FUNNEL_STAGE_BAR_COLORS,
  FUNNEL_STAGES,
} from "./candidate-funnel.constants";

type CandidateFunnelRowsProps = {
  data: RecruiterCandidateFunnelResponse;
  applied: number;
};

export function CandidateFunnelRows({
  data,
  applied,
}: CandidateFunnelRowsProps) {
  return (
    <div className="flex flex-col gap-3">
      {FUNNEL_STAGES.map((stage, index) => {
        const value = data[stage.key] ?? 0;
        const pctLabel = formatFunnelPercent(value, applied);
        const subtitle =
          index === 0 ? "total applied" : `${pctLabel}% of applied`;

        return (
          <div
            key={stage.key}
            className="grid grid-cols-[minmax(88px,128px)_minmax(0,1fr)_minmax(72px,84px)] items-center gap-3"
          >
            <span className="text-sm font-medium text-foreground">
              {stage.label}
            </span>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-200",
                  FUNNEL_STAGE_BAR_COLORS[index],
                  getFunnelBarWidthClassName(value, applied)
                )}
              />
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums tracking-tight text-foreground">
                {value}
              </p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
