import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TAB_ROUTE_BASES } from "@/lib/tab-routes";
import type { ActiveJobItem } from "../types";

type ActiveJobsMobileListProps = {
  jobs: ActiveJobItem[];
};

export function ActiveJobsMobileList({ jobs }: ActiveJobsMobileListProps) {
  const navigate = useNavigate();

  return (
    <div className="sm:hidden">
      {jobs.map((job) => {
        const actionLabel =
          job.status === "draft" ? "Continue Editing" : "View Candidates";

        return (
          <div
            key={job.id}
            className="border-b border-border/60 px-3 py-3 last:border-b-0 sm:px-0"
          >
            <div className="pb-3">
              <span className="min-w-0 break-words text-sm font-bold text-foreground">
                {job.title}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Applications
              </span>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {job.applicationCount}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Days Open
              </span>
              <span className="text-sm text-muted-foreground">
                {job.status === "draft" ? "—" : `${job.daysOpen} days`}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-9 w-full rounded-lg border-border bg-card text-xs font-medium"
              onClick={() =>
                navigate(
                  job.status === "draft"
                    ? `${TAB_ROUTE_BASES.myJobPosts}/${job.id}/edit`
                    : `${TAB_ROUTE_BASES.myJobPosts}/${job.id}`
                )
              }
            >
              {actionLabel}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
