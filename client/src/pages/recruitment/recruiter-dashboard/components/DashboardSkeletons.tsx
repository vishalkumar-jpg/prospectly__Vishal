import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_CARD_PADDING_X_CLASS,
  DASHBOARD_SECTION_ICON_CLASS,
} from "./dashboardCard.styles";

export function HiringOverviewCardSkeleton() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex h-full flex-col px-3 py-4 sm:p-4">
        <div className="flex items-start gap-3 pb-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="border-t border-border/70 pt-3">
          <Skeleton className="h-4 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PriorityActionRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 px-3 py-3 last:border-b-0 sm:rounded-xl sm:border sm:border-border/70">
      <Skeleton className={cn(DASHBOARD_SECTION_ICON_CLASS, "rounded-lg")} />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
    </div>
  );
}

export function CandidateFunnelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(88px,128px)_minmax(0,1fr)_minmax(72px,84px)] items-center gap-3"
          >
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-2.5 w-full rounded-full" />
            <div className="space-y-1 text-right">
              <Skeleton className="ml-auto h-4 w-8" />
              <Skeleton className="ml-auto h-3 w-14" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border/70 pt-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function ActiveJobsTableSkeleton() {
  return (
    <>
      <div className="space-y-3 sm:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="border-b border-border/60 px-3 py-3 last:border-b-0 sm:px-0"
          >
            <Skeleton className="mb-3 h-4 w-40" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-3 h-4 w-full" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <div className="hidden space-y-0 sm:block">
        <div className="flex gap-4 pb-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="ml-auto h-3 w-14" />
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-t border-border py-3"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="ml-auto h-8 w-28 rounded-lg" />
          </div>
        ))}
      </div>
    </>
  );
}

export function RecentActivityRowSkeleton() {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/60 py-3 last:border-b-0",
        DASHBOARD_CARD_PADDING_X_CLASS
      )}
    >
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <Skeleton className="h-4 flex-1" />
      <div className="w-full pl-12 sm:w-auto sm:pl-0">
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
