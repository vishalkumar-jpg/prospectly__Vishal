import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TAB_ROUTE_BASES } from "@/lib/tab-routes";
import type { ActiveJobItem } from "../types";

type ActiveJobsTableProps = {
  jobs: ActiveJobItem[];
};

export function ActiveJobsTable({ jobs }: ActiveJobsTableProps) {
  const navigate = useNavigate();

  return (
    <div className="thin-scroll hidden min-w-0 overflow-x-auto sm:block">
      <Table className="min-w-[560px]">
        <TableHeader>
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className="h-auto pb-2 pl-0 pr-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Job Title
            </TableHead>
            <TableHead className="h-auto pb-2 pr-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Applications
            </TableHead>
            <TableHead className="h-auto pb-2 pr-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Days Open
            </TableHead>
            <TableHead className="h-auto pb-2 pr-0 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const actionLabel =
              job.status === "draft" ? "Continue Editing" : "View Candidates";

            return (
              <TableRow
                key={job.id}
                className="border-0 hover:bg-transparent"
              >
                <TableCell className="max-w-0 border-t border-border py-3 pl-0 pr-3 align-middle">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        tabIndex={0}
                        className="line-clamp-2 min-w-0 break-words text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {job.title}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      {job.title}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="border-t border-border py-3 pr-3 text-center align-middle text-sm font-bold tabular-nums text-foreground">
                  {job.applicationCount}
                </TableCell>
                <TableCell className="border-t border-border py-3 pr-3 text-center align-middle text-sm text-muted-foreground">
                  {job.status === "draft" ? "—" : `${job.daysOpen} days`}
                </TableCell>
                <TableCell className="border-t border-border py-3 pr-0 text-right align-middle">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg border-border bg-card px-3 text-xs font-medium"
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
