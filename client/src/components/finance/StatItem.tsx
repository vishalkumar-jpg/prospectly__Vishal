import { cn } from "@/lib/utils";
import {
  PageStatCard,
  PAGE_STAT_CARD_LG_WIDTH_CLASS,
  type PageStatCardProps,
} from "@/components/ui/page-stat-card";

export interface StatItemProps extends PageStatCardProps {
  isCurrency?: boolean;
}

export function StatItem({
  className,
  isCurrency,
  prefix,
  decimals,
  ...props
}: StatItemProps) {
  return (
    <PageStatCard
      {...props}
      prefix={prefix ?? (isCurrency ? "$" : undefined)}
      decimals={decimals ?? (isCurrency ? 2 : 0)}
      className={cn(PAGE_STAT_CARD_LG_WIDTH_CLASS, className)}
    />
  );
}
