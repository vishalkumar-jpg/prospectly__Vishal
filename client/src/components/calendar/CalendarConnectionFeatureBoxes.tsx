import { cn } from "@/lib/utils";
import { CheckCircle, Shield, Sparkles, Zap } from "lucide-react";

export function CalendarConnectionFeatureBoxes() {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div
          className={cn(
            "flex flex-col items-center rounded-xl border border-border bg-card p-4 text-center transition-all duration-200",
            "hover:border-sky-500/40 hover:shadow-[0_4px_16px_rgba(36,170,222,0.08)]"
          )}
        >
          <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-[10px] bg-sky-500/[0.06] text-sky-600 dark:text-sky-400">
            <Zap className="h-[18px] w-[18px]" />
          </span>
          <h5 className="mb-1 text-[13px] font-bold text-foreground">
            Auto Scheduling
          </h5>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Prospects book instantly based on your availability
          </p>
        </div>
        <div
          className={cn(
            "flex flex-col items-center rounded-xl border border-border bg-card p-4 text-center transition-all duration-200",
            "hover:border-sky-500/40 hover:shadow-[0_4px_16px_rgba(36,170,222,0.08)]"
          )}
        >
          <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-[10px] bg-sky-500/[0.06] text-sky-600 dark:text-sky-400">
            <CheckCircle className="h-[18px] w-[18px]" />
          </span>
          <h5 className="mb-1 text-[13px] font-bold text-foreground">
            Real-time Sync
          </h5>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Calendar changes sync automatically with webhook notifications
          </p>
        </div>
        <div
          className={cn(
            "flex flex-col items-center rounded-xl border border-border bg-card p-4 text-center transition-all duration-200",
            "hover:border-sky-500/40 hover:shadow-[0_4px_16px_rgba(36,170,222,0.08)]"
          )}
        >
          <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-[10px] bg-sky-500/[0.06] text-sky-600 dark:text-sky-400">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <h5 className="mb-1 text-[13px] font-bold text-foreground">
            Meeting Tracking
          </h5>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Track meeting status and outcomes for better insights
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 rounded-[10px] border border-sky-500/12 bg-sky-500/[0.06] px-4 py-2.5">
        <Shield
          className="h-[18px] w-[18px] shrink-0 text-sky-600 dark:text-sky-400"
          strokeWidth={2}
        />
        <p className="text-xs leading-snug text-muted-foreground">
          <strong className="font-semibold text-foreground">
            Secure Integration
          </strong>{" "}
          — All calendar connections use OAuth 2.0. Your credentials are
          encrypted and never shared.
        </p>
      </div>
    </>
  );
}
