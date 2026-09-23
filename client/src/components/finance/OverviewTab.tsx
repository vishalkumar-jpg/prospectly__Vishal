import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { RevenueChart } from "@/components/finance/RevenueChart";
import { TransactionBreakdownChart } from "@/components/finance/TransactionBreakdownChart";
import { PayoutTimeline } from "@/components/finance/PayoutTimeline";
import { getFinanceStatusBadge } from "@/components/finance/FinanceStatusBadge";
import type { FinancialSummary } from "@/hooks/useFinancialSummary";
import type { RecentActivityItem } from "@/hooks/useRecentActivity";

interface OverviewTabProps {
  summary: FinancialSummary;
  activities: RecentActivityItem[];
  activitiesLoading: boolean;
  getActivityIcon: (type: string) => React.ReactNode;
  formatCurrency: (amount: number) => string;
}

export function OverviewTab({
  summary,
  activities,
  activitiesLoading,
  getActivityIcon,
  formatCurrency,
}: OverviewTabProps) {
  return (
    <div className="mt-0 space-y-8 overflow-x-hidden md:overflow-x-visible">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 h-full overflow-x-auto overflow-y-hidden lg:overflow-visible -mx-2 pl-4 pr-2 lg:mx-0 lg:px-0 kanban-scroll">
          <RevenueChart />
        </div>
        <div className="min-w-0 h-full overflow-x-auto overflow-y-hidden lg:overflow-visible -mx-2 pl-4 pr-2 lg:mx-0 lg:px-0 kanban-scroll">
          <TransactionBreakdownChart />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 overflow-x-auto overflow-y-hidden lg:overflow-visible -mx-2 pl-4 pr-2 lg:mx-0 lg:px-0 kanban-scroll">
          <Card className="border border-border shadow-md bg-white">
            <CardHeader className="p-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Recent Transactions
                </CardTitle>
              </div>
              <CardDescription>Latest 5 transactions</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              {activitiesLoading ? (
                <Loader size="sm" />
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No recent transactions
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
                      data-testid={`activity-item-${activity.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatLocalizedShortDateTime(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                          -{formatCurrency(activity.amount)}
                        </span>
                        {getFinanceStatusBadge(activity.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {(summary.role === "connector" || summary.role === "both") && (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden lg:overflow-visible -mx-2 pl-4 pr-2 lg:mx-0 lg:px-0 kanban-scroll">
            <PayoutTimeline />
          </div>
        )}
      </div>
    </div>
  );
}
