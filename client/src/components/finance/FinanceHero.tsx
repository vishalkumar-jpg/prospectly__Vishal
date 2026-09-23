import type { ReactNode } from "react";
import { PageHeaderSection } from "@/components/ui/page-header";
import { PAGE_STATS_SLOT_MIN_HEIGHT_CLASS } from "@/components/ui/page-stat-card";
import { cn } from "@/lib/utils";

interface FinanceHeroProps {
  heading: string;
  description: string;
  rightSlot?: ReactNode;
  statsClassName?: string;
}

export function FinanceHero({
  heading,
  description,
  rightSlot,
  statsClassName = "lg:w-[640px]",
}: FinanceHeroProps) {
  return (
    <PageHeaderSection
      title={heading}
      description={description}
      stats={
        rightSlot ? (
          <div
            className={cn(
              "flex w-full flex-col items-stretch lg:items-start lg:justify-end",
              PAGE_STATS_SLOT_MIN_HEIGHT_CLASS
            )}
          >
            {rightSlot}
          </div>
        ) : undefined
      }
      statsClassName={statsClassName}
      className="lg:min-h-[64px]"
    />
  );
}
