import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TrustScoreRingChartProps {
  score: number; // 0-10
  size?: number;
  className?: string;
}

export function TrustScoreRingChart({
  score,
  size = 200,
  className,
}: TrustScoreRingChartProps) {
  const [displayScore, setDisplayScore] = useState(0);

  // Animate score on mount/change
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const stepDuration = duration / steps;
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore((prev) => {
          const increment = (score - prev) / (steps - currentStep + 1);
          return prev + increment;
        });
      }
    }, stepDuration);
    return () => clearInterval(timer);
  }, [score]);

  // Calculate percentage (0-100) for the ring
  const percentage = (displayScore / 10) * 100;
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on score
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-emerald-600";
    if (score >= 6) return "text-blue-600";
    if (score >= 4) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 8) return "from-emerald-500 to-emerald-600";
    if (score >= 6) return "from-blue-500 to-blue-600";
    if (score >= 4) return "from-amber-500 to-amber-600";
    return "from-red-500 to-red-600";
  };

  const scoreColor = getScoreColor(score);
  const gradientId = `scoreGradient-${score}`;

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop
              offset="0%"
              stopColor={
                score >= 8
                  ? "#10b981"
                  : score >= 6
                    ? "#3b82f6"
                    : score >= 4
                      ? "#f59e0b"
                      : "#ef4444"
              }
            />
            <stop
              offset="100%"
              stopColor={
                score >= 8
                  ? "#059669"
                  : score >= 6
                    ? "#2563eb"
                    : score >= 4
                      ? "#d97706"
                      : "#dc2626"
              }
            />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="none"
          className="text-slate-200 dark:text-slate-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300 ease-out"
          style={{
            filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.3))",
          }}
        />
      </svg>
      {/* Score text in center */}
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <div
          className={cn(
            "text-5xl font-bold transition-all duration-300",
            scoreColor
          )}
        >
          {displayScore.toFixed(1)}
        </div>
        <div className="text-sm text-muted-foreground mt-1">/ 10</div>
      </div>
    </div>
  );
}
