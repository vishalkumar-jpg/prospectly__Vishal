import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DollarSign, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AVG_PAYOUT,
  BUTTON_STEP,
  MAX_CONNECTIONS,
  MIN_CONNECTIONS,
  SLIDER_STEP,
  estimateMatchable,
  estimateYearlyUsd,
  sliderFillPercent,
} from "@/components/getting-started/networkEstimatorUtils";
import {
  importModalAccentGradientBr,
  importModalCtaShadow,
} from "@/components/getting-started/import-modal/modalStyles";

interface GettingStartedNetworkEstimatorProps {
  connections: number;
  onConnectionsChange: (next: number) => void;
  onImportCtaClick?: () => void;
}

export function GettingStartedNetworkEstimator({
  connections,
  onConnectionsChange,
  onImportCtaClick,
}: GettingStartedNetworkEstimatorProps) {
  const yearly = useMemo(
    () => estimateYearlyUsd(connections),
    [connections]
  );
  const matchable = useMemo(
    () => estimateMatchable(connections),
    [connections]
  );
  const fillPct = sliderFillPercent(connections);
  const trackBackground = `linear-gradient(90deg, hsl(var(--gs-amethyst)) ${fillPct}%, hsl(var(--border)) ${fillPct}%)`;

  const handleScrollToImport = () => {
    if (onImportCtaClick) {
      onImportCtaClick();
      return;
    }
    document.getElementById("connect-contacts")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleConnectionsBump = (delta: number) => {
    const next = Math.min(
      MAX_CONNECTIONS,
      Math.max(MIN_CONNECTIONS, connections + delta)
    );
    onConnectionsChange(
      Math.round(next / SLIDER_STEP) * SLIDER_STEP
    );
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border bg-card py-[18px] px-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
      )}
    >
      <div className="mb-3 flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gs-accent-from to-gs-accent-to">
          <DollarSign className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground leading-tight">
            See what your network is worth
          </p>
          <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
            Adjust your connection count to estimate earnings
          </p>
        </div>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-center mb-0.5">
        Your earning potential
      </p>
      <div className="flex items-baseline justify-center gap-1.5 mb-1">
        <span
          className={cn(
            "font-mono text-[34px] font-extrabold leading-none tracking-tight",
            "bg-gradient-to-br from-gs-accent-from to-gs-accent-to bg-clip-text text-transparent"
          )}
        >
          ${yearly.toLocaleString()}
        </span>
        <span className="text-[13px] font-semibold text-muted-foreground">
          /year
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground text-center mb-3">
        from warm introductions alone
      </p>

      <div className="mb-2">
        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
          Your connections
        </label>
        <div className="flex items-stretch overflow-hidden rounded-lg border-[1.5px] border-border bg-background">
          <button
            type="button"
            className="flex h-8 w-9 items-center justify-center bg-secondary text-gs-amethyst hover:bg-gs-amethyst/15 hover:text-gs-rose text-lg font-bold transition-colors"
            onClick={() => handleConnectionsBump(-BUTTON_STEP)}
            aria-label="Decrease connections"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="flex-1 py-[5px] text-center font-mono text-base font-extrabold tabular-nums">
            {connections.toLocaleString()}
          </div>
          <button
            type="button"
            className="flex h-8 w-9 items-center justify-center bg-secondary text-gs-amethyst hover:bg-gs-amethyst/15 hover:text-gs-rose text-lg font-bold transition-colors"
            onClick={() => handleConnectionsBump(BUTTON_STEP)}
            aria-label="Increase connections"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1 px-0.5">
          <input
            type="range"
            min={MIN_CONNECTIONS}
            max={MAX_CONNECTIONS}
            step={SLIDER_STEP}
            value={connections}
            onChange={(e) =>
              onConnectionsChange(Number(e.target.value))
            }
            className={cn(
              "mt-1 h-1 w-full cursor-pointer appearance-none rounded-sm",
              "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5",
              "[&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded",
              "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background",
              "[&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-gs-accent-from [&::-webkit-slider-thumb]:to-gs-accent-to",
              "[&::-webkit-slider-thumb]:shadow-gs-thumb [&::-webkit-slider-thumb]:cursor-grab"
            )}
            style={{ background: trackBackground }}
            aria-label="Connection count"
          />
        </div>
      </div>

      <div className="mt-2.5 flex overflow-hidden rounded-lg border border-gs-amethyst/25 bg-gs-amethyst/5">
        <div className="flex-1 border-r border-gs-amethyst/20 py-[7px] px-1 text-center">
          <div className="font-mono text-[13px] font-extrabold tabular-nums">
            ~{connections.toLocaleString()}
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">
            connections
          </div>
        </div>
        <div className="flex-1 border-r border-gs-amethyst/20 py-[7px] px-1 text-center">
          <div className="font-mono text-[13px] font-extrabold tabular-nums">
            ${AVG_PAYOUT}
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">
            avg payout
          </div>
        </div>
        <div className="flex-1 py-[7px] px-1 text-center">
          <div className="font-mono text-[13px] font-extrabold tabular-nums">
            {matchable}
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">
            matchable
          </div>
        </div>
      </div>

      <Button
        type="button"
        className={cn(
          "mt-3 w-full rounded-[10px] py-2.5 text-sm font-bold text-white hover:opacity-95",
          importModalAccentGradientBr,
          importModalCtaShadow
        )}
        onClick={handleScrollToImport}
      >
        Import Contacts & Start Earning
      </Button>
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground leading-snug">
        Takes 60 seconds.{" "}
        <strong className="font-bold text-gs-rose">+$60 in Connector Credits</strong>{" "}
        when you connect.
      </p>
    </div>
  );
}
