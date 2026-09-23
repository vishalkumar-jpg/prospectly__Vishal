import { cn } from "@/lib/utils";
import { Sparkles, TrendingUp, Users, Clock } from "lucide-react";

interface ScoreBreakdown {
  networkProximity: number; // 0-100
  bountyValue: number; // 0-100
  urgencyLevel: number; // 0-100
  successRate: number; // 0-100
}

interface OpportunityScoreRingProps {
  score: number; // 0-100 overall score
  breakdown?: ScoreBreakdown;
  size?: "sm" | "md" | "lg";
  showBreakdown?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { size: 64, stroke: 6, innerSize: 48 },
  md: { size: 88, stroke: 8, innerSize: 68 },
  lg: { size: 112, stroke: 10, innerSize: 88 },
};

function getScoreColor(score: number): { gradient: string; text: string } {
  if (score >= 80)
    return {
      gradient: "from-emerald-400 to-green-500",
      text: "text-emerald-600",
    };
  if (score >= 60)
    return { gradient: "from-amber-400 to-orange-500", text: "text-amber-600" };
  if (score >= 40)
    return { gradient: "from-blue-400 to-indigo-500", text: "text-blue-600" };
  return { gradient: "from-slate-400 to-slate-500", text: "text-slate-600" };
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent Match";
  if (score >= 60) return "Good Match";
  if (score >= 40) return "Fair Match";
  return "Low Match";
}

export function OpportunityScoreRing({
  score,
  breakdown,
  size = "md",
  showBreakdown = false,
  className,
}: OpportunityScoreRingProps) {
  const config = sizeConfig[size];
  const radius = (config.size - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const colors = getScoreColor(score);

  return (
    <div className={cn("inline-flex items-center gap-4", className)}>
      {/* Score Ring */}
      <div className="relative">
        <svg
          width={config.size}
          height={config.size}
          className="transform -rotate-90"
        >
          {/* Background */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            strokeWidth={config.stroke}
            className="stroke-slate-100"
          />
          {/* Progress with gradient effect using multiple stops */}
          <defs>
            <linearGradient
              id="scoreGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop
                offset="0%"
                className="[stop-color:theme(colors.amber.400)]"
              />
              <stop
                offset="100%"
                className="[stop-color:theme(colors.orange.500)]"
              />
            </linearGradient>
          </defs>
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            stroke="url(#scoreGradient)"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Sparkles className={cn("h-4 w-4 mb-0.5", colors.text)} />
          <span className={cn("text-xl font-black", colors.text)}>{score}</span>
        </div>
      </div>

      {/* Breakdown (optional) */}
      {showBreakdown && breakdown && (
        <div className="space-y-1.5">
          <BreakdownItem
            icon={Users}
            label="Network"
            value={breakdown.networkProximity}
          />
          <BreakdownItem
            icon={TrendingUp}
            label="Value"
            value={breakdown.bountyValue}
          />
          <BreakdownItem
            icon={Clock}
            label="Urgency"
            value={breakdown.urgencyLevel}
          />
        </div>
      )}

      {/* Label only (when no breakdown) */}
      {!showBreakdown && (
        <div className="flex flex-col">
          <span className={cn("text-sm font-semibold", colors.text)}>
            {getScoreLabel(score)}
          </span>
          <span className="text-xs text-muted-foreground">
            Opportunity Score
          </span>
        </div>
      )}
    </div>
  );
}

function BreakdownItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground w-14">{label}</span>
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
