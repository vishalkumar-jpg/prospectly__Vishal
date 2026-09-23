import { type ReactNode } from "react";
import { AnimatedCounter } from "@/components/ui/innovative";
import { cn } from "@/lib/utils";

export type HeroStatColor = "blue" | "purple" | "emerald" | "green" | "orange" | "slate";

export interface HeroStat {
  value: number;
  label: string;
  color: HeroStatColor;
  prefix?: string;
}

const STAT_COLORS: Record<
  HeroStatColor,
  {
    box: string;
    text: string;
    label: string;
  }
> = {
  blue: {
    box: "bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800",
    text: "bg-gradient-to-br from-blue-600 to-blue-500 bg-clip-text text-transparent",
    label: "text-blue-600/80",
  },
  purple: {
    box: "bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800",
    text: "bg-gradient-to-br from-purple-600 to-purple-500 bg-clip-text text-transparent",
    label: "text-purple-600/80",
  },
  emerald: {
    box: "bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800",
    text: "bg-gradient-to-br from-emerald-600 to-emerald-500 bg-clip-text text-transparent",
    label: "text-emerald-600/80",
  },
  green: {
    box: "bg-white dark:bg-slate-900 border border-green-200 dark:border-green-800",
    text: "bg-gradient-to-br from-green-600 to-green-500 bg-clip-text text-transparent",
    label: "text-green-600/80",
  },
  orange: {
    box: "bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800",
    text: "bg-gradient-to-br from-orange-600 to-orange-500 bg-clip-text text-transparent",
    label: "text-orange-600/80",
  },
  slate: {
    box: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700",
    text: "bg-gradient-to-br from-slate-600 to-slate-500 bg-clip-text text-transparent",
    label: "text-slate-500/80",
  },
};

function HeroStatCard({ stat }: { stat: HeroStat }) {
  const colors = STAT_COLORS[stat.color];

  return (
    <div
      className={cn(
        "text-center flex flex-col justify-center rounded-xl shadow-sm hover:shadow-md transition-all duration-300",
        colors.box,
        "w-full min-w-0 min-h-[4rem] px-1 py-2 sm:px-2 sm:py-3 lg:w-40 lg:h-16 lg:px-0 lg:py-0"
      )}
    >
      <div className={cn("font-bold text-lg sm:text-xl lg:text-xl", colors.text)}>
        <AnimatedCounter
          value={stat.value}
          prefix={stat.prefix ?? ""}
          className={cn("font-bold text-lg sm:text-xl lg:text-xl", colors.text)}
        />
      </div>
      <div
        className={cn(
          "text-[10px] font-medium uppercase tracking-wider",
          colors.label
        )}
      >
        {stat.label}
      </div>
    </div>
  );
}

export interface DashboardPageHeroProps {
  title: string;
  subtitle: string;
  stats?: HeroStat[];
  actions?: ReactNode;
}

export function DashboardPageHero({
  title,
  subtitle,
  stats = [],
  actions,
}: DashboardPageHeroProps) {
  return (
    <header className="border-b bg-gradient-to-r from-card via-card/95 to-card/90 backdrop-blur-xl sticky top-0 z-20 shadow-lg shadow-primary/5">
      <div className="mx-2 sm:mx-3 md:mx-4 lg:mx-6 py-4 flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              {title}
            </h1>
            <p className="text-muted-foreground mt-1 text-base">{subtitle}</p>
            {actions ? (
              <div className="flex flex-wrap gap-2 lg:hidden">{actions}</div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 w-full shrink-0 lg:w-auto lg:flex-row lg:items-center lg:gap-4">
            {actions ? (
              <div className="hidden lg:flex items-center gap-2 shrink-0">{actions}</div>
            ) : null}

            {stats.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full lg:flex lg:flex-row lg:gap-4 lg:w-auto">
                {stats.map((stat) => (
                  <HeroStatCard key={stat.label} stat={stat} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
