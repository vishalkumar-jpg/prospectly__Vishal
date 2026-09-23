import { cn } from "@/lib/utils";
import { Shield, Check } from "lucide-react";

interface VerificationStep {
  id: string;
  label: string;
  completed: boolean;
}

interface ShieldProgressProps {
  steps: VerificationStep[];
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeConfig = {
  sm: { shield: "h-12 w-12", icon: "h-5 w-5", badge: "h-3 w-3" },
  md: { shield: "h-16 w-16", icon: "h-7 w-7", badge: "h-4 w-4" },
  lg: { shield: "h-20 w-20", icon: "h-9 w-9", badge: "h-5 w-5" },
};

export function ShieldProgress({
  steps,
  size = "md",
  className,
}: ShieldProgressProps) {
  const config = sizeConfig[size];
  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const isComplete = completedCount === steps.length;

  return (
    <div className={cn("inline-flex flex-col items-center gap-3", className)}>
      {/* Shield Icon */}
      <div className="relative">
        {/* Background shield (empty) */}
        <div
          className={cn(
            "flex items-center justify-center rounded-lg",
            "bg-gradient-to-br from-slate-100 to-slate-200",
            "border-2 border-slate-300",
            config.shield
          )}
        >
          <Shield className={cn("text-slate-400", config.icon)} />
        </div>

        {/* Filled shield overlay */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-lg overflow-hidden",
            "transition-all duration-500 ease-out"
          )}
          style={{
            clipPath: `inset(${100 - progress}% 0 0 0)`,
          }}
        >
          <div
            className={cn(
              "flex items-center justify-center w-full h-full",
              isComplete
                ? "bg-gradient-to-br from-emerald-400 to-green-500 border-2 border-emerald-300"
                : "bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-amber-300"
            )}
          >
            <Shield className={cn("text-white", config.icon)} />
          </div>
        </div>

        {/* Completion checkmark */}
        {isComplete && (
          <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5 shadow-md animate-in zoom-in duration-300">
            <Check className={cn("text-white", config.badge)} />
          </div>
        )}
      </div>

      {/* Progress text */}
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">
          {completedCount}/{steps.length} Verified
        </p>
        <p className="text-xs text-muted-foreground">
          {isComplete ? "Fully Verified" : "Complete verification"}
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              "h-1.5 w-6 rounded-full transition-all duration-300",
              step.completed ? "bg-emerald-500" : "bg-slate-200"
            )}
            title={step.label}
          />
        ))}
      </div>
    </div>
  );
}
