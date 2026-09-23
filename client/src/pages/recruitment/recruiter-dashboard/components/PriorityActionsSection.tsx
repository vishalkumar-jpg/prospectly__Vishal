import { useNavigate } from "react-router-dom";
import { ChevronRight, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TAB_ROUTE_BASES } from "@/lib/tab-routes";
import { getPriorityActionIcon } from "../utils/dashboardUi.utils";
import {
  DASHBOARD_CARD_CONTENT_PADDING_X_CLASS,
  DASHBOARD_CARD_PADDING_X_CLASS,
  DASHBOARD_SECTION_ICON_CLASS,
  DASHBOARD_SECTION_TITLE_CLASS,
} from "./dashboardCard.styles";
import { PriorityActionRowSkeleton } from "./DashboardSkeletons";
import type { PriorityActionItem } from "../types";

type PriorityActionsSectionProps = {
  items: PriorityActionItem[];
  waitingCount: number;
  loading: boolean;
  refreshing?: boolean;
};

export function PriorityActionsSection({
  items,
  waitingCount,
  loading,
  refreshing = false,
}: PriorityActionsSectionProps) {
  const navigate = useNavigate();

  // Nothing to act on → hide the whole card rather than an empty shell.
  if (!loading && items.length === 0) return null;

  return (
    <Card className="w-full self-start border-border/70 shadow-sm">
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between space-y-0 pb-3",
          DASHBOARD_CARD_PADDING_X_CLASS
        )}
      >
        <CardTitle className={DASHBOARD_SECTION_TITLE_CLASS}>
          <span
            className={cn(
              DASHBOARD_SECTION_ICON_CLASS,
              "bg-brand-rose/10 text-brand-rose"
            )}
          >
            <Zap className="h-4 w-4" />
          </span>
          Priority Actions
        </CardTitle>
        <Badge className="bg-brand-rose/10 font-medium text-brand-rose hover:bg-brand-rose/10">
          {waitingCount} waiting
        </Badge>
      </CardHeader>
      <CardContent
        className={cn(
          "space-y-0 transition-opacity sm:space-y-2.5",
          DASHBOARD_CARD_CONTENT_PADDING_X_CLASS,
          refreshing && "opacity-60"
        )}
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <PriorityActionRowSkeleton key={index} />
          ))
        ) : (
          items.map((item) => {
            const { icon: ActionIcon, className: iconClass } =
              getPriorityActionIcon(item.type);
            return (
              <button
                key={`${item.jobId}-${item.type}`}
                type="button"
                onClick={() =>
                  navigate(`${TAB_ROUTE_BASES.myJobPosts}/${item.jobId}`)
                }
                className="flex w-full items-start gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:rounded-xl sm:border sm:border-border/70 sm:bg-card sm:last:border-b"
              >
                <span className={cn(DASHBOARD_SECTION_ICON_CLASS, iconClass)}>
                  <ActionIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-start gap-1.5 text-sm font-semibold text-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-rose" />
                    <span className="break-words sm:truncate">
                      {item.jobTitle}
                    </span>
                  </p>
                  <p className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground sm:truncate">
                    {item.message}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge className="min-w-[28px] justify-center bg-brand-rose px-2 text-white hover:bg-brand-rose">
                    {item.count}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
