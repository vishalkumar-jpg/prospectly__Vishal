import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TAB_ROUTE_BASES } from "@/lib/tab-routes";
import { POST_A_JOB_PATH } from "@/constants/recruitment-routes";
import { ActiveJobsTableSkeleton } from "./DashboardSkeletons";
import { ActiveJobsTable } from "./ActiveJobsTable";
import { ActiveJobsMobileList } from "./ActiveJobsMobileList";
import {
  DASHBOARD_CARD_CONTENT_PADDING_X_CLASS,
  DASHBOARD_CARD_PADDING_X_CLASS,
} from "./dashboardCard.styles";
import type { ActiveJobItem } from "../types";

type ActiveJobsSectionProps = {
  jobs: ActiveJobItem[];
  loading: boolean;
  refreshing?: boolean;
};

export function ActiveJobsSection({
  jobs,
  loading,
  refreshing = false,
}: ActiveJobsSectionProps) {
  const navigate = useNavigate();
  const handlePostNewJob = () => navigate(POST_A_JOB_PATH);
  const activeJobCount = jobs.filter((job) => job.status === "active").length;
  const hasActiveJobs = activeJobCount > 0;

  return (
    <Card className="w-full min-w-0 self-start border-border/70 shadow-sm">
      <CardHeader
        className={cn(
          "flex flex-col gap-2 space-y-0 pb-3 sm:flex-row sm:items-start sm:justify-between",
          DASHBOARD_CARD_PADDING_X_CLASS
        )}
      >
        <div className="min-w-0">
          <CardTitle className="text-sm font-bold leading-tight text-foreground">
            Active Jobs
          </CardTitle>
          {hasActiveJobs ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Your {activeJobCount} live post{activeJobCount === 1 ? "" : "s"},
              best performing first
            </p>
          ) : null}
        </div>
        {!loading && hasActiveJobs ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 self-start rounded-[10px] border-border bg-card px-3 text-xs font-medium sm:self-auto"
            onClick={() => navigate(`${TAB_ROUTE_BASES.myJobPosts}/active`)}
          >
            View all
            <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent
        className={cn(
          "space-y-3 transition-opacity",
          DASHBOARD_CARD_CONTENT_PADDING_X_CLASS,
          refreshing && "opacity-60"
        )}
      >
        {loading ? (
          <ActiveJobsTableSkeleton />
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-3 py-6 sm:px-0">
            <p className="text-center text-sm text-muted-foreground">
              No active or draft jobs right now. Post a new role to get started.
            </p>
            <Button
              className="bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
              onClick={handlePostNewJob}
            >
              <Plus className="mr-2 h-4 w-4" />
              Post New Job
            </Button>
          </div>
        ) : (
          <>
            <ActiveJobsMobileList jobs={jobs} />
            <ActiveJobsTable jobs={jobs} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
