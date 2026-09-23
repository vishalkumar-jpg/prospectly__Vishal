import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number; // 0-100
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  label?: string;
  colorScheme?: "amber" | "green" | "blue" | "purple";
  className?: string;
}

const sizeConfig = {
  sm: { size: 48, stroke: 4, fontSize: "text-xs" },
  md: { size: 72, stroke: 6, fontSize: "text-sm" },
  lg: { size: 96, stroke: 8, fontSize: "text-lg" },
};

const colorConfig = {
  amber: {
    track: "stroke-amber-100",
    progress: "stroke-amber-500",
    text: "text-amber-700",
  },
  green: {
    track: "stroke-emerald-100",
    progress: "stroke-emerald-500",
    text: "text-emerald-700",
  },
  blue: {
    track: "stroke-blue-100",
    progress: "stroke-blue-500",
    text: "text-blue-700",
  },
  purple: {
    track: "stroke-purple-100",
    progress: "stroke-purple-500",
    text: "text-purple-700",
  },
};

export function CircularProgress({
  value,
  size = "md",
  showValue = true,
  label,
  colorScheme = "amber",
  className,
}: CircularProgressProps) {
  const config = sizeConfig[size];
  const colors = colorConfig[colorScheme];
  const radius = (config.size - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div
      className={cn("relative inline-flex flex-col items-center", className)}
    >
      <svg
        width={config.size}
        height={config.size}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          strokeWidth={config.stroke}
          className={colors.track}
        />
        {/* Progress arc */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            colors.progress,
            "transition-all duration-700 ease-out"
          )}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold", config.fontSize, colors.text)}>
            {Math.round(value)}%
          </span>
        </div>
      )}
      {label && (
        <span className="mt-1 text-xs text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
