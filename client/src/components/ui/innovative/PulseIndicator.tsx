import { cn } from "@/lib/utils";

interface PulseIndicatorProps {
  urgency: "urgent" | "high" | "normal" | "low";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { dot: "h-2 w-2", ring: "h-4 w-4" },
  md: { dot: "h-3 w-3", ring: "h-6 w-6" },
  lg: { dot: "h-4 w-4", ring: "h-8 w-8" },
};

const urgencyConfig = {
  urgent: {
    color: "bg-red-500",
    ring: "bg-red-400",
    label: "Urgent",
    animation: "animate-ping",
    speed: "[animation-duration:0.75s]",
  },
  high: {
    color: "bg-amber-500",
    ring: "bg-amber-400",
    label: "High Priority",
    animation: "animate-ping",
    speed: "[animation-duration:1s]",
  },
  normal: {
    color: "bg-blue-500",
    ring: "bg-blue-400",
    label: "Normal",
    animation: "animate-pulse",
    speed: "[animation-duration:2s]",
  },
  low: {
    color: "bg-slate-400",
    ring: "bg-slate-300",
    label: "Flexible",
    animation: "",
    speed: "",
  },
};

export function PulseIndicator({
  urgency,
  size = "md",
  showLabel = false,
  className,
}: PulseIndicatorProps) {
  const sizeStyles = sizeConfig[size];
  const urgencyStyles = urgencyConfig[urgency];

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="relative flex items-center justify-center">
        {/* Pulsing ring */}
        {urgencyStyles.animation && (
          <span
            className={cn(
              "absolute rounded-full opacity-75",
              sizeStyles.ring,
              urgencyStyles.ring,
              urgencyStyles.animation,
              urgencyStyles.speed
            )}
          />
        )}
        {/* Static dot */}
        <span
          className={cn(
            "relative rounded-full",
            sizeStyles.dot,
            urgencyStyles.color
          )}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-muted-foreground">
          {urgencyStyles.label}
        </span>
      )}
    </div>
  );
}
