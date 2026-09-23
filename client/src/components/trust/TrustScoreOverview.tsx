import { Button } from "@/components/ui/button";
import {
  Shield,
  Loader2,
  TrendingUp,
  Award,
  Users,
  Target,
  Zap,
  History,
} from "lucide-react";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { toUTC } from "@/lib/dayjs";
import { AnimatedCounter } from "@/components/ui/innovative";
import { cn } from "@/lib/utils";

/**
 * Trust ring matching the sample design: 120px, 9px stroke, amethyst→rose
 * gradient arc, gradient number. Score is 0–10.
 */
function BrandTrustRing({ score }: { score: number }) {
  const size = 120;
  const stroke = 9;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(score / 10, 1));
  const dashoffset = circumference - pct * circumference;

  return (
    <div className="relative h-[120px] w-[120px]">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <defs>
          <linearGradient
            id="trustRingGrad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop
              offset="0%"
              className="[stop-color:hsl(var(--brand-amethyst))]"
            />
            <stop
              offset="100%"
              className="[stop-color:hsl(var(--brand-rose))]"
            />
          </linearGradient>
        </defs>
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-secondary"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="url(#trustRingGrad)"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-brand-gradient text-[32px] font-extrabold leading-none">
          {score.toFixed(1)}
        </span>
        <span className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
          / 10
        </span>
      </div>
    </div>
  );
}

interface TrustScoreOverviewProps {
  trustScore: number;
  trustScoreLoading: boolean;
  lastUpdated?: string | null;
  earnedRulesCount: number;
  feedbackTotalCount: number;
  onHistoryClick?: () => void;
  className?: string;
  /** Stack the ring on top instead of beside the info (used on the Trust page). */
  stackedRing?: boolean;
}

export function TrustScoreOverview({
  trustScore,
  trustScoreLoading,
  lastUpdated,
  earnedRulesCount,
  feedbackTotalCount,
  onHistoryClick,
  className = "lg:col-span-4",
  stackedRing = false,
}: TrustScoreOverviewProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card shadow-brand-card",
        className
      )}
    >
      <div className="relative z-10 p-6">
        {trustScoreLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="space-y-4 text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-amethyst" />
              <div>
                <p className="text-lg font-medium text-foreground">
                  Loading your trust score...
                </p>
                <p className="mt-1 text-muted-foreground">
                  Please wait while we fetch your data
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
                  <Shield className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Trust Score
                </h2>
              </div>
              {onHistoryClick && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onHistoryClick}
                  aria-label="View trust score history"
                  className="gap-1.5"
                >
                  <History className="h-4 w-4" />
                  History
                </Button>
              )}
            </div>

            {/* Ring (left) + info (right), or stacked on the Trust page */}
            <div
              className={cn(
                "gap-7",
                stackedRing
                  ? "flex flex-col"
                  : "grid grid-cols-1 items-start sm:grid-cols-[auto_1fr] sm:items-center"
              )}
            >
              {/* Left: ring + status */}
              <div className="flex flex-shrink-0 flex-col items-center gap-2.5">
                <BrandTrustRing score={trustScore} />

                {trustScore >= 4 ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-brand-success/20 bg-brand-success/10 px-3 py-1.5">
                    {trustScore >= 8 ? (
                      <>
                        <Zap className="h-3.5 w-3.5 text-brand-success" />
                        <span className="text-sm font-medium text-brand-success">
                          Excellent
                        </span>
                      </>
                    ) : trustScore >= 6 ? (
                      <>
                        <TrendingUp className="h-3.5 w-3.5 text-brand-sky" />
                        <span className="text-sm font-medium text-brand-sky">
                          Good Progress
                        </span>
                      </>
                    ) : (
                      <>
                        <Target className="h-3.5 w-3.5 text-brand-warning" />
                        <span className="text-sm font-medium text-brand-warning">
                          Keep Improving
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-brand-rose/20 bg-brand-rose/10 px-3 py-1.5">
                    <Target className="h-3.5 w-3.5 text-brand-rose" />
                    <span className="text-sm font-medium text-brand-rose">
                      Building
                    </span>
                  </div>
                )}
              </div>

              {/* Right: description + metrics + benefits + improve */}
              <div className="min-w-0 space-y-4">
                <h3 className="text-[15.5px] font-bold tracking-tight text-foreground">
                  Your reputation on the platform
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-brand-amethyst/15 bg-brand-amethyst/5 p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-brand-amethyst/10 text-brand-amethyst">
                        <Award className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-muted-foreground">
                          Achievements
                        </p>
                        <div className="text-lg font-bold text-foreground">
                          <AnimatedCounter value={earnedRulesCount} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-brand-sky/15 bg-brand-sky/5 p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-brand-sky/10 text-brand-sky">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-muted-foreground">
                          Peer Reviews
                        </p>
                        <div className="text-lg font-bold text-foreground">
                          <AnimatedCounter value={feedbackTotalCount} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-brand-sky/15 bg-brand-sky/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-brand-sky/10 text-brand-sky">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="mb-1 font-semibold text-foreground">
                        Score Benefits
                      </h4>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Higher scores unlock faster payouts, priority matching,
                        and exclusive opportunities.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-brand-amethyst/15 bg-gradient-to-r from-brand-amethyst/10 to-brand-rose/5 p-4">
                  <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-amethyst">
                    Improve Your Score
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-success" />
                      Complete more introductions
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-amethyst" />
                      Earn positive peer feedback
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-sky" />
                      Maintain consistent performance
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground/80">
                    Last updated:{" "}
                    {lastUpdated
                      ? formatLocalizedShortDateTime(toUTC(lastUpdated))
                      : "Never"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
