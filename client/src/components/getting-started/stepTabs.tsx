import { cn } from "@/lib/utils";

type TabDef = { step: number; short: string; label: string };

interface GettingStartedStepTabsProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  tabs: readonly TabDef[];
  /** Kept for callers; completion ticks are not shown in the tab UI. */
  stepComplete?: Record<number, boolean>;
  className?: string;
}

export function GettingStartedStepTabs({
  currentStep,
  onStepChange,
  tabs,
  className,
}: GettingStartedStepTabsProps) {
  return (
    <div className={cn("mb-6 flex justify-center sm:mb-8", className)}>
      <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-[12px] bg-secondary p-1">
        {tabs.map(({ step, short, label }) => {
          const isActive = currentStep === step;
          return (
            <button
              key={step}
              type="button"
              onClick={() => onStepChange(step)}
              className={cn(
                "shrink-0 rounded-[9px] px-4 py-3 text-sm font-semibold transition-all sm:px-6",
                "flex min-w-0 flex-row flex-wrap items-center gap-x-2.5 gap-y-0.5 text-left sm:justify-center sm:text-center",
                isActive
                  ? "bg-background text-gs-rose shadow-gs-tab-active"
                  : "text-muted-foreground hover:bg-black/[0.03] hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5",
                  isActive ? "opacity-100" : "opacity-70"
                )}
              >
                <span className="text-xs font-semibold tracking-wide">
                  {short}
                </span>
              </span>
              <span className="min-w-0 text-sm font-semibold leading-snug">
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(" ")[0]}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
