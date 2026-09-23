import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/dateFormatter";
import {
  ACTIVITY_AVATAR_COLORS,
  getActivityInitials,
  parseActivityMessage,
} from "../utils/dashboardUi.utils";
import {
  DASHBOARD_CARD_PADDING_X_CLASS,
  DASHBOARD_SECTION_ICON_CLASS,
  DASHBOARD_SECTION_TITLE_CLASS,
} from "./dashboardCard.styles";
import { RecentActivityRowSkeleton } from "./DashboardSkeletons";
import type { RecentActivityItem } from "../types";

type RecentActivitySectionProps = {
  items: RecentActivityItem[];
  loading: boolean;
  refreshing?: boolean;
};

export function RecentActivitySection({
  items,
  loading,
  refreshing = false,
}: RecentActivitySectionProps) {
  // No activity yet → hide the whole card rather than an empty shell.
  if (!loading && items.length === 0) return null;

  return (
    <Card className="w-full self-start border-border/70 shadow-sm">
      <CardHeader className={cn("pb-3", DASHBOARD_CARD_PADDING_X_CLASS)}>
        <CardTitle className={DASHBOARD_SECTION_TITLE_CLASS}>
          <span
            className={cn(
              DASHBOARD_SECTION_ICON_CLASS,
              "rounded-full bg-brand-success/10 text-brand-success"
            )}
          >
            <Activity className="h-4 w-4" />
          </span>
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent
        className={cn(
          "px-0 pb-2 transition-opacity",
          refreshing && "opacity-60"
        )}
      >
        {loading ? (
          <div>
            {Array.from({ length: 6 }).map((_, index) => (
              <RecentActivityRowSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div>
            {items.map((item, index) => {
              const { prefix, lead, rest } = parseActivityMessage(item.message);
              const avatarColor =
                ACTIVITY_AVATAR_COLORS[index % ACTIVITY_AVATAR_COLORS.length];
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/60 py-3 last:border-b-0",
                    DASHBOARD_CARD_PADDING_X_CLASS
                  )}
                >
                  <div
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold",
                      avatarColor
                    )}
                  >
                    {getActivityInitials(item.message)}
                  </div>
                  <p className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground">
                    {prefix}
                    <span className="font-semibold text-foreground">
                      {lead}
                    </span>
                    {rest}
                  </p>
                  <span className="w-full pl-12 text-xs text-muted-foreground sm:w-auto sm:pl-0">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
