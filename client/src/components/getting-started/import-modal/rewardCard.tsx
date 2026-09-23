import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { UseTrustScoreRewardDisplayResult } from "@/hooks/useTrustScoreRewardDisplay";
import {
  formatConnectorCreditsEarnedTooltip,
  formatConnectorCreditsUnlockTooltip,
} from "@/lib/getting-started-import-rewards";

const TOOLTIP_TRUST =
  "Earn Trust Score Points by importing contacts from your network.";

function connectorCreditsTooltipText(
  threshold: number | null,
  creditsValue: number | null,
  isEarned: boolean
): string {
  if (threshold != null && creditsValue != null) {
    if (isEarned) {
      return formatConnectorCreditsEarnedTooltip(threshold, creditsValue);
    }
    return formatConnectorCreditsUnlockTooltip(threshold, creditsValue);
  }
  return "Import enough contacts from this source to receive Connector Credits.";
}

interface ImportModalRewardCardProps {
  reward: UseTrustScoreRewardDisplayResult;
  /** Default: bordered card. `plain` for embedding inside success panels. */
  framing?: "card" | "plain";
}

/** Trust Score Points + Connector Credits in one scannable row */
export function ImportModalRewardCard({
  reward,
  framing = "card",
}: ImportModalRewardCardProps) {
  const { trust, connector, amount, isLoading } = reward;
  const trustVal = isLoading && trust.amount === "…" ? "…" : amount;
  const connectorVal =
    connector.dollarDisplay != null ? connector.dollarDisplay : "—";

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          "mb-0 p-3.5",
          framing === "card" &&
            "rounded-xl border border-[rgba(0,182,122,0.12)] bg-gradient-to-br from-[rgba(0,182,122,0.06)] to-[rgba(0,182,122,0.02)]"
        )}
      >
        <div className="flex flex-wrap items-stretch justify-between gap-4 sm:flex-nowrap sm:gap-6">
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                Trust Score Points
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="About Trust Score Points"
                  >
                    <Info className="h-3 w-3 shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-left">
                  <p>{TOOLTIP_TRUST}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="mt-0.5 font-mono text-xl font-bold leading-none text-[#00B67A] sm:text-2xl">
              {trustVal}
            </div>
          </div>
          <div className="min-w-0 flex-1 text-right sm:text-right">
            <div className="flex items-center justify-end gap-1">
              <span className="text-[11px] font-semibold text-foreground">
                Connector Credits
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="About Connector Credits"
                  >
                    <Info className="h-3 w-3 shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-left">
                  <p>
                    {connectorCreditsTooltipText(
                      connector.threshold,
                      connector.creditsValue,
                      connector.isEarned
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="mt-0.5 font-mono text-2xl font-extrabold leading-none tracking-tight text-foreground sm:text-[28px]">
              {connectorVal}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
