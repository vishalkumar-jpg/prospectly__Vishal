import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { AnimatedCounter } from "@/components/ui/innovative";
import type { StatItem } from "./types";

interface StatsGridProps {
  stats: StatItem[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className={cn(
            "relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all",
            stat.link
              ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-brand-card"
              : "cursor-default"
          )}
          onClick={() => stat.link && navigate(stat.link)}
        >
          <CardContent className="p-4">
            <div
              className={cn(
                "mb-3 grid h-9 w-9 place-items-center rounded-xl",
                stat.bgColor
              )}
            >
              <stat.icon className={cn("h-[18px] w-[18px]", stat.color)} />
            </div>

            <p className="mb-1 text-xs font-semibold text-muted-foreground">
              {stat.title}
            </p>

            <div className="text-2xl font-extrabold leading-tight tracking-tight text-foreground">
              {stat.numericValue !== undefined ? (
                <AnimatedCounter
                  value={stat.numericValue}
                  prefix={stat.prefix}
                  decimals={stat.decimals}
                />
              ) : (
                stat.value
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn(
                  "border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em]",
                  stat.trendColor
                )}
              >
                {stat.trendValue !== null && stat.trendValue !== undefined ? (
                  <>
                    {stat.trendValue > 0 ? (
                      <TrendingUp className="mr-1 h-2.5 w-2.5" />
                    ) : stat.trendValue < 0 ? (
                      <TrendingDown className="mr-1 h-2.5 w-2.5" />
                    ) : null}
                    {stat.trend}
                  </>
                ) : (
                  stat.trend
                )}
              </Badge>
              <span className="text-[11px] font-medium text-muted-foreground">
                {stat.trendLabel}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
