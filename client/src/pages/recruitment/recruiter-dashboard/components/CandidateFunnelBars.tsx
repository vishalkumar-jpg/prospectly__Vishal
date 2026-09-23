import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecruiterCandidateFunnelResponse } from "../types";
import { getFunnelBarHeightClassName } from "../utils/funnelBarClasses";
import { formatFunnelPercent } from "../utils/formatFunnelPercent";
import { FUNNEL_STAGES } from "./candidate-funnel.constants";

type CandidateFunnelBarsProps = {
  data: RecruiterCandidateFunnelResponse;
  applied: number;
};

export function CandidateFunnelBars({
  data,
  applied,
}: CandidateFunnelBarsProps) {
  return (
    <div className="hidden w-full items-stretch gap-1 sm:flex sm:gap-2">
      {FUNNEL_STAGES.map((stage, index) => {
        const value = data[stage.key] ?? 0;
        const pctLabel = formatFunnelPercent(value, applied);

        return (
          <div key={stage.key} className="flex min-w-0 flex-1 items-stretch">
            <div className="flex min-w-0 flex-1 flex-col items-center">
              <div className="mb-2 text-center">
                <p className="text-xl font-bold leading-none text-foreground sm:text-2xl">
                  {value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">({pctLabel}%)</p>
              </div>
              <div className="flex h-28 w-full items-end rounded-xl bg-muted/40 px-1.5 pb-1.5 sm:h-32">
                <div
                  className={cn(
                    "w-full rounded-t-md bg-gradient-to-t from-brand-rose to-brand-amethyst",
                    getFunnelBarHeightClassName(value, applied)
                  )}
                />
              </div>
              <p className="mt-2 text-center text-xs font-medium text-muted-foreground sm:text-sm">
                {stage.label}
              </p>
            </div>
            {index < FUNNEL_STAGES.length - 1 ? (
              <div className="flex shrink-0 items-center self-center px-0.5 pt-10 text-muted-foreground/50 sm:px-1">
                <ChevronRight className="h-4 w-4" />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
