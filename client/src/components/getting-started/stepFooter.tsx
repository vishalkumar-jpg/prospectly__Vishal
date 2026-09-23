import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GettingStartedStepFooterProps {
  currentStep: number;
  onNext: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  nextLabel: string;
  skipNote?: string;
  showSkip?: boolean;
  nextDisabled?: boolean;
  className?: string;
}

export function GettingStartedStepFooter({
  currentStep,
  onNext,
  onBack,
  onSkip,
  nextLabel,
  skipNote = "You can change this later anytime.",
  showSkip = true,
  nextDisabled = false,
  className,
}: GettingStartedStepFooterProps) {
  return (
    <div
      className={cn(
        "mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="flex flex-col gap-1">
        {onBack ? (
          <Button
            type="button"
            variant="link"
            className="h-auto justify-start p-0 text-muted-foreground no-underline hover:text-foreground hover:underline"
            onClick={onBack}
          >
            ← Back
          </Button>
        ) : showSkip ? (
          <>
            <Button
              type="button"
              variant="link"
              className="h-auto justify-start p-0 text-muted-foreground no-underline hover:text-foreground hover:underline"
              onClick={onSkip ?? onNext}
            >
              Skip for now →
            </Button>
            <p className="text-xs text-muted-foreground">{skipNote}</p>
          </>
        ) : null}
      </div>
      <Button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className={cn(
          "w-full shrink-0 rounded-[14px] border-0 px-10 py-3.5 text-base font-bold text-white shadow-gs-next sm:w-auto",
          "bg-gs-rose hover:bg-gs-rose/90 hover:-translate-y-0.5 hover:shadow-gs-next-hover",
          "transition-transform"
        )}
      >
        {nextLabel}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
      {/* Keep currentStep referenced for callers that key footer by step */}
      <span className="sr-only">Step {currentStep}</span>
    </div>
  );
}
