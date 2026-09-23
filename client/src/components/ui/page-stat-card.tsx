import { AnimatedCounter } from "@/components/ui/innovative";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export const PAGE_STAT_CARD_CLASS =
  "relative flex flex-nowrap items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card px-[18px] py-[13px] shadow-sm";

export const PAGE_STAT_ICON_CLASS =
  "grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] bg-brand-amethyst/10 text-brand-amethyst";

export const PAGE_STAT_LABEL_CLASS =
  "mb-0.5 truncate text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground";

export const PAGE_STAT_VALUE_CLASS =
  "whitespace-nowrap text-xl font-extrabold leading-none tracking-tight text-foreground";

/** Full width on mobile; fixed width on desktop header rows. */
export const PAGE_STAT_CARD_LG_WIDTH_CLASS = "w-full lg:w-[228px]";

/** Full width on mobile; wider equal width for 3-card finance rows on desktop. */
export const PAGE_STAT_CARD_THREE_COL_WIDTH_CLASS = "w-full lg:w-[200px]";

export const PAGE_STATS_GRID_FOUR_CLASS =
  "grid grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-4";

export const PAGE_STATS_ROW_END_CLASS =
  "flex w-full flex-col gap-2.5 sm:gap-3 lg:flex-row lg:flex-wrap lg:justify-end";

export const PAGE_STATS_GRID_THREE_END_CLASS =
  "grid w-full grid-cols-1 gap-2.5 sm:gap-3 lg:ml-auto lg:w-fit lg:max-w-full lg:grid-cols-3 lg:pr-1";

export const PAGE_STATS_SLOT_MIN_HEIGHT_CLASS = "lg:min-h-[64px]";

export interface PageStatCardProps {
  label: string;
  icon: LucideIcon;
  value: number | string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function PageStatCard({
  label,
  icon: Icon,
  value,
  prefix,
  suffix,
  decimals = 0,
  className,
}: PageStatCardProps) {
  const renderValue = () => {
    if (typeof value === "number") {
      return (
        <AnimatedCounter
          value={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          className={PAGE_STAT_VALUE_CLASS}
        />
      );
    }

    if (typeof value === "string" && value.includes(" / ")) {
      const [first, second] = value
        .split(" / ")
        .map((part) => parseFloat(part));
      if (!Number.isNaN(first) && !Number.isNaN(second)) {
        return (
          <span className={PAGE_STAT_VALUE_CLASS}>
            <AnimatedCounter value={first} />
            {" / "}
            <AnimatedCounter value={second} />
          </span>
        );
      }
    }

    return <span className={PAGE_STAT_VALUE_CLASS}>{value}</span>;
  };

  return (
    <div className={cn(PAGE_STAT_CARD_CLASS, className)}>
      <div className={PAGE_STAT_ICON_CLASS}>
        <Icon className="h-[17px] w-[17px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={PAGE_STAT_LABEL_CLASS} title={label}>
          {label}
        </p>
        {renderValue()}
      </div>
    </div>
  );
}
