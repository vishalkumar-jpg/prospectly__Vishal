import type { ElementType, KeyboardEvent } from "react";
import {
  Zap,
  AlertTriangle,
  Calendar,
  Trophy,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { DASHBOARD_MESSAGES } from "@/constants/dashboard.constants";
import { formatMeetingDateWithTimezone } from "@/utils/dateFormatting";

interface PriorityActions {
  urgentIntros: { count: number; message?: string };
  upcomingMeetings: {
    thisWeekCount: number;
    thisMonthCount: number;
    totalCount: number;
    nextMeetingDate?: string;
  };
  marketplaceOpportunities: { count: number };
}

interface PriorityActionsCardProps {
  priorityActions: PriorityActions | null | undefined;
  priorityActionsLoading: boolean;
  priorityActionsError: unknown;
  refetchPriorityActions: () => void;
  onViewMeetings: () => void;
}

const ROW_CLASS =
  "group flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-border bg-gradient-to-b from-secondary/60 to-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-brand-card sm:gap-4 sm:p-4";
const ARROW_CLASS =
  "h-[18px] w-[18px] flex-shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-brand-rose";

function LoadingRow({ Icon }: { Icon: ElementType }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-transparent bg-secondary/50 p-4">
      <div className="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function buildUpcomingMeetingsLabel(
  meetings: PriorityActions["upcomingMeetings"] | undefined
): string {
  if (!meetings) return "No upcoming meetings";
  if (meetings.thisWeekCount > 0) {
    const noun = meetings.thisWeekCount === 1 ? "meeting" : "meetings";
    return `${meetings.thisWeekCount} ${noun} this week`;
  }
  if (meetings.thisMonthCount > 0) {
    const noun = meetings.thisMonthCount === 1 ? "meeting" : "meetings";
    return `${meetings.thisMonthCount} ${noun} this month`;
  }
  if (meetings.totalCount > 0) {
    const noun = meetings.totalCount === 1 ? "meeting" : "meetings";
    return `${meetings.totalCount} ${noun} scheduled`;
  }
  return "No upcoming meetings";
}

function hasUpcomingMeetings(
  meetings: PriorityActions["upcomingMeetings"] | undefined
): boolean {
  if (!meetings) return false;
  return (
    meetings.thisWeekCount > 0 ||
    meetings.thisMonthCount > 0 ||
    meetings.totalCount > 0
  );
}

function buildUpcomingMeetingsSubtext(
  meetings: PriorityActions["upcomingMeetings"] | undefined,
  hasMeetings: boolean
): string {
  if (!hasMeetings) return "All clear!";
  const nextDate = meetings?.nextMeetingDate;
  const nextLabel = nextDate
    ? formatMeetingDateWithTimezone(nextDate)
    : "No upcoming meetings";
  return `Next: ${nextLabel}`;
}

function PriorityActionsErrorAlert({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert className="border-l-4 border-l-brand-destructive bg-brand-destructive/5 sm:col-span-2">
      <AlertTriangle className="h-5 w-5 text-brand-destructive" />
      <AlertDescription>
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="mb-1 truncate font-semibold text-foreground">
              {DASHBOARD_MESSAGES.ERROR.UNABLE_TO_LOAD_PRIORITY_ACTIONS}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {DASHBOARD_MESSAGES.ERROR.PRIORITY_ACTIONS_ERROR_DESCRIPTION}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="ml-2 flex-shrink-0 sm:ml-6"
          >
            Retry
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function UrgentIntrosRow({
  count,
  message,
  onNavigate,
}: {
  count: number;
  message: string;
  onNavigate: () => void;
}) {
  const introLabel = count === 1 ? "intro" : "intros";

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onNavigate();
    }
  };

  return (
    <div
      className={ROW_CLASS}
      onClick={onNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-brand-rose/10 text-brand-rose">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {`${count} ${introLabel} ${message}`}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Don't lose these opportunities
        </p>
      </div>
      <ChevronRight className={ARROW_CLASS} />
    </div>
  );
}

function UpcomingMeetingsRow({
  label,
  subtext,
  onViewMeetings,
}: {
  label: string;
  subtext: string;
  onViewMeetings: () => void;
}) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onViewMeetings();
    }
  };

  return (
    <div
      className={ROW_CLASS}
      onClick={onViewMeetings}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-brand-sky/10 text-brand-sky">
        <Calendar className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {label}
        </p>
        <p className="truncate text-xs text-muted-foreground">{subtext}</p>
      </div>
      <ChevronRight className={ARROW_CLASS} />
    </div>
  );
}

function MarketplaceOpportunitiesRow({
  count,
  onNavigate,
}: {
  count: number;
  onNavigate: () => void;
}) {
  const opportunityLabel = count === 1 ? "opportunity" : "opportunities";

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onNavigate();
    }
  };

  return (
    <div
      className={`${ROW_CLASS} sm:col-span-2`}
      onClick={onNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
        <Trophy className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {count} new marketplace {opportunityLabel}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Matched to your network
        </p>
      </div>
      <ChevronRight className={ARROW_CLASS} />
    </div>
  );
}

function PriorityActionsContent({
  priorityActions,
  priorityActionsLoading,
  onViewMeetings,
  onNavigateInbox,
  onNavigateOpportunities,
}: {
  priorityActions: PriorityActions | null | undefined;
  priorityActionsLoading: boolean;
  onViewMeetings: () => void;
  onNavigateInbox: () => void;
  onNavigateOpportunities: () => void;
}) {
  const meetings = priorityActions?.upcomingMeetings;
  const upcomingLabel = buildUpcomingMeetingsLabel(meetings);
  const meetingsScheduled = hasUpcomingMeetings(meetings);
  const upcomingSubtext = buildUpcomingMeetingsSubtext(
    meetings,
    meetingsScheduled
  );

  return (
    <>
      {priorityActionsLoading ? (
        <LoadingRow Icon={AlertTriangle} />
      ) : (
        <UrgentIntrosRow
          count={priorityActions?.urgentIntros.count ?? 0}
          message={
            priorityActions?.urgentIntros.message ?? "need your response"
          }
          onNavigate={onNavigateInbox}
        />
      )}
      {priorityActionsLoading ? (
        <LoadingRow Icon={Calendar} />
      ) : (
        <UpcomingMeetingsRow
          label={upcomingLabel}
          subtext={upcomingSubtext}
          onViewMeetings={onViewMeetings}
        />
      )}
      {priorityActionsLoading ? (
        <div className="sm:col-span-2">
          <LoadingRow Icon={Trophy} />
        </div>
      ) : (
        <MarketplaceOpportunitiesRow
          count={priorityActions?.marketplaceOpportunities.count ?? 0}
          onNavigate={onNavigateOpportunities}
        />
      )}
    </>
  );
}

export function PriorityActionsCard({
  priorityActions,
  priorityActionsLoading,
  priorityActionsError,
  refetchPriorityActions,
  onViewMeetings,
}: PriorityActionsCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-brand-card">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-rose/10 text-brand-rose">
            <Zap className="h-5 w-5" />
          </div>
          <CardTitle className="text-lg font-bold tracking-tight">
            Priority Actions
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 px-3 pt-0 sm:grid-cols-2 md:px-6">
        {priorityActionsError ? (
          <PriorityActionsErrorAlert onRetry={refetchPriorityActions} />
        ) : (
          <PriorityActionsContent
            priorityActions={priorityActions}
            priorityActionsLoading={priorityActionsLoading}
            onViewMeetings={onViewMeetings}
            onNavigateInbox={() =>
              navigate("/prospecting/incoming-requests/inbox")
            }
            onNavigateOpportunities={() =>
              navigate("/prospecting/opportunities")
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
