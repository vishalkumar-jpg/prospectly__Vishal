import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { utcDayjs } from "@/lib/dayjs";
import { TAB_ROUTE_BASES } from "@/lib/tab-routes";
import {
  DASHBOARD_CARD_PADDING_X_CLASS,
  DASHBOARD_SECTION_ICON_CLASS,
  DASHBOARD_SECTION_TITLE_CLASS,
} from "./dashboardCard.styles";
import { RecentActivityRowSkeleton } from "./DashboardSkeletons";
import type { PayoutDueItem, RecruiterPayoutsDueResponse } from "../types";

/** Query params read by JobDetailWithKanban to open the Release dialog. */
export const PAYOUT_DEEP_LINK_PARAM = "payout";
export const PAYOUT_SCOPE_PARAM = "payoutScope";

/** Rows shown before "View all" expands the list into the scroll area. */
const COLLAPSED_ROW_COUNT = 5;

type PayoutsDueSectionProps = {
  data: RecruiterPayoutsDueResponse | undefined;
  loading: boolean;
  refreshing?: boolean;
  error?: boolean;
  onRetry: () => void;
};

function formatPayoutAmount(amount: string, currency: string) {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase());
  return letters.join("") || "?";
}

function getDueStatusPill(item: PayoutDueItem): {
  icon: LucideIcon;
  label: string;
  className: string;
} {
  if (item.isFailed) {
    return {
      icon: RotateCcw,
      label: "Retry needed",
      className: "bg-brand-destructive/10 text-brand-destructive",
    };
  }
  if (item.dueStatus === "overdue") {
    return {
      icon: AlertTriangle,
      label: `Overdue ${Math.abs(item.daysUntilRelease)}d`,
      className: "bg-brand-destructive/10 text-brand-destructive",
    };
  }
  if (item.dueStatus === "due_today") {
    return {
      icon: Clock,
      label: "Due today",
      className: "bg-brand-warning/10 text-brand-warning",
    };
  }
  return {
    icon: CalendarClock,
    label: `In ${item.daysUntilRelease}d`,
    className: "bg-brand-sky/10 text-brand-sky",
  };
}

/**
 * Shows the most urgent payouts; "View all" expands the full list inside a
 * fixed-height scroll so the card never stretches the dashboard column, and
 * "View less" collapses it again. Hidden entirely when nothing is due.
 */
export function PayoutsDueSection({
  data,
  loading,
  refreshing = false,
  error = false,
  onRetry,
}: PayoutsDueSectionProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const items = data?.items ?? [];
  const canExpand = items.length > COLLAPSED_ROW_COUNT;
  const visibleItems =
    expanded || !canExpand ? items : items.slice(0, COLLAPSED_ROW_COUNT);
  const totalCount = data?.totalCount ?? 0;
  const overdueCount = data?.overdueCount ?? 0;
  const dueTodayCount = data?.dueTodayCount ?? 0;

  if (!loading && !error && items.length === 0) return null;

  const openPayout = (item: PayoutDueItem) => {
    const params = new URLSearchParams({
      [PAYOUT_DEEP_LINK_PARAM]: item.candidateId,
      [PAYOUT_SCOPE_PARAM]: item.payoutType,
    });
    navigate(`${TAB_ROUTE_BASES.myJobPosts}/${item.jobId}?${params}`);
  };

  const renderBody = () => {
    if (loading) {
      return Array.from({ length: 4 }).map((_, index) => (
        <RecentActivityRowSkeleton key={index} />
      ));
    }
    if (error) {
      return (
        <div
          className={cn(
            "flex flex-col items-center gap-3 py-6 text-center",
            DASHBOARD_CARD_PADDING_X_CLASS
          )}
        >
          <p className="text-sm text-muted-foreground">
            Something went wrong loading your payouts.
          </p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      );
    }
    return (
      <div
        className={cn(expanded && "thin-scroll max-h-[344px] overflow-y-auto")}
      >
        {visibleItems.map((item) => {
          const pill = getDueStatusPill(item);
          const PillIcon = pill.icon;
          const isConnector = item.payoutType === "connector";
          const context = isConnector
            ? `for ${item.candidateName}`
            : "Candidate bonus";
          return (
            <button
              key={item.payoutId}
              type="button"
              onClick={() => openPayout(item)}
              className={cn(
                "flex w-full items-center gap-3 border-b border-border/60 py-2.5 text-left transition-colors duration-200 last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                DASHBOARD_CARD_PADDING_X_CLASS
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                  isConnector
                    ? "bg-brand-amethyst/10 text-brand-amethyst"
                    : "bg-brand-sky/10 text-brand-sky"
                )}
              >
                {getInitials(item.recipientName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {item.recipientName}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider",
                        isConnector
                          ? "bg-brand-amethyst/10 text-brand-amethyst"
                          : "bg-brand-sky/10 text-brand-sky"
                      )}
                    >
                      {isConnector ? "Connector" : "Candidate"}
                    </span>
                  </p>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                    {formatPayoutAmount(item.amount, item.currency)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p
                    className="min-w-0 truncate text-xs text-muted-foreground"
                    title={`${item.jobTitle} · ${context}`}
                  >
                    {utcDayjs(item.releaseDate).local().format("DD MMM")} ·{" "}
                    {item.jobTitle} · {context}
                  </p>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
                      pill.className
                    )}
                  >
                    <PillIcon className="h-3 w-3" />
                    {pill.label}
                  </span>
                </div>
              </div>
              <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="w-full self-start border-border/70 shadow-sm">
      <CardHeader
        className={cn(
          "flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3",
          DASHBOARD_CARD_PADDING_X_CLASS
        )}
      >
        <CardTitle className={DASHBOARD_SECTION_TITLE_CLASS}>
          <span
            className={cn(
              DASHBOARD_SECTION_ICON_CLASS,
              "bg-brand-amethyst/10 text-brand-amethyst"
            )}
          >
            <Wallet className="h-4 w-4" />
          </span>
          Payouts Due
        </CardTitle>
        {!loading && !error ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {overdueCount > 0 ? (
              <Badge className="gap-1 bg-brand-destructive/10 font-medium text-brand-destructive hover:bg-brand-destructive/10">
                <AlertTriangle className="h-3 w-3" />
                {overdueCount} overdue
              </Badge>
            ) : null}
            {dueTodayCount > 0 ? (
              <Badge className="gap-1 bg-brand-warning/10 font-medium text-brand-warning hover:bg-brand-warning/10">
                <Clock className="h-3 w-3" />
                {dueTodayCount} today
              </Badge>
            ) : null}
            {overdueCount === 0 && dueTodayCount === 0 ? (
              <Badge className="bg-brand-amethyst/10 font-medium text-brand-amethyst hover:bg-brand-amethyst/10">
                {totalCount} due
              </Badge>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent
        className={cn(
          "px-0 pb-2 transition-opacity",
          refreshing && "opacity-60"
        )}
      >
        {renderBody()}
        {!loading && !error && canExpand ? (
          <div className={cn("pt-2", DASHBOARD_CARD_PADDING_X_CLASS)}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full gap-1 text-xs font-medium"
              aria-expanded={expanded}
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? (
                <>
                  View less
                  <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  {items.length < totalCount
                    ? `View ${items.length} most urgent`
                    : `View all (${items.length})`}
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        ) : null}
        {!loading && !error && expanded && items.length < totalCount ? (
          <p
            className={cn(
              "pt-2 text-center text-xs text-muted-foreground",
              DASHBOARD_CARD_PADDING_X_CLASS
            )}
          >
            Showing the {items.length} most urgent of {totalCount}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
