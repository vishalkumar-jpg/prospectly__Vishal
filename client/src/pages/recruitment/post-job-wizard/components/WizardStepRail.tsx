import { Check, ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardStepRailStep {
  id: number;
  title: string;
  readOnly?: boolean;
}

interface WizardStepRailProps {
  steps: WizardStepRailStep[];
  currentStep: number;
  /** Furthest step reached; any step up to this is clickable. Defaults to
   * `currentStep` (sequential lock) when omitted. */
  maxStep?: number;
  onStepSelect: (stepId: number) => void;
  /** Vertical rail (post-a-job desktop) or horizontal strip (delete account) */
  layout?: "vertical" | "horizontal";
  ariaLabel?: string;
}

export default function WizardStepRail({
  steps,
  currentStep,
  maxStep,
  onStepSelect,
  layout = "vertical",
  ariaLabel = "Wizard progress",
}: WizardStepRailProps) {
  // Guard the invariant: a step is never both active and locked, even if a
  // caller passes a maxStep below the current step.
  const reachableMax = Math.max(maxStep ?? currentStep, currentStep);
  const isHorizontal = layout === "horizontal";

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "rounded-2xl border border-border bg-card p-3 shadow-brand-card sm:p-4",
        !isHorizontal && "lg:sticky lg:top-2"
      )}
    >
      <p
        className={cn(
          "px-1 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground",
          !isHorizontal && "lg:pb-3"
        )}
      >
        Progress
      </p>
      <ol
        className={cn(
          "flex pb-1",
          isHorizontal
            ? "w-full flex-row items-center gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "gap-1 max-lg:flex-nowrap max-lg:overflow-x-auto max-lg:thin-scroll lg:flex-col lg:overflow-visible lg:pb-0"
        )}
      >
        {steps.flatMap((step, index) => {
          const isActive = currentStep === step.id;
          const isDone = currentStep > step.id;
          const isLocked = step.id > reachableMax;
          const isClickable = !isActive && !isLocked;
          const isLast = index === steps.length - 1;

          const separator =
            isHorizontal && index > 0 ? (
              <li
                key={`sep-${step.id}`}
                aria-hidden
                className="flex shrink-0 items-center self-center px-1"
              >
                <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
              </li>
            ) : null;

          const stepItem = (
            <li
              key={step.id}
              className={cn(
                isHorizontal ? "min-w-0 flex-1" : "max-lg:shrink-0"
              )}
            >
              <button
                type="button"
                disabled={isLocked}
                onClick={() => !isLocked && onStepSelect(step.id)}
                className={cn(
                  "relative flex items-center gap-2 rounded-xl text-left font-semibold transition-all duration-200",
                  isHorizontal
                    ? "w-full min-w-0 px-2.5 py-2.5 text-[13px]"
                    : "w-full gap-2.5 whitespace-nowrap px-3 py-2.5 text-[13px] max-lg:w-auto",
                  isActive &&
                    "bg-brand-amethyst/10 text-brand-amethyst before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r before:bg-brand-gradient before:content-['']",
                  isActive && !isHorizontal && "max-lg:before:hidden",
                  isDone && "text-brand-amethyst",
                  isClickable && "cursor-pointer hover:bg-brand-amethyst/10",
                  isLocked && "cursor-not-allowed text-muted-foreground/60",
                  !isActive && !isDone && !isLocked && "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "relative grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold transition-colors",
                    isActive && "bg-brand-amethyst text-brand-foreground",
                    isDone && "bg-brand-amethyst text-brand-foreground",
                    isLocked &&
                      "border border-border bg-secondary text-muted-foreground",
                    !isActive &&
                      !isDone &&
                      !isLocked &&
                      "border border-border bg-secondary text-muted-foreground",
                    !isHorizontal &&
                      !isLast &&
                      "lg:after:absolute lg:after:left-1/2 lg:after:top-full lg:after:h-6 lg:after:w-px lg:after:-translate-x-1/2 lg:after:content-['']",
                    !isHorizontal &&
                      !isLast &&
                      (isDone
                        ? "lg:after:bg-brand-amethyst"
                        : "lg:after:bg-border")
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : step.id}
                </span>
                <span
                  className={cn(
                    isHorizontal
                      ? "min-w-0 flex-1 truncate"
                      : "max-lg:whitespace-nowrap lg:truncate"
                  )}
                >
                  {step.title}
                </span>
                {step.readOnly && (
                  <Lock className="ml-auto h-3 w-3 shrink-0 opacity-60" />
                )}
              </button>
            </li>
          );

          return separator ? [separator, stepItem] : [stepItem];
        })}
      </ol>
    </nav>
  );
}
