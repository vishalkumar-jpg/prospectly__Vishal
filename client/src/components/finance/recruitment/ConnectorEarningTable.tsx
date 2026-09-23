import { Fragment, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ConnectorEarningJobGroup } from "@/lib/api/connector-earning";
import { EarningCandidateRow } from "./earning-table/EarningCandidateRow";
import { EarningJobRow } from "./earning-table/EarningJobRow";
import {
  EARNING_COLUMN_WIDTHS,
  EARNING_DETAIL_COLUMN_CLASS,
} from "./earning-table/earningTableUtils";
import { SpendingTablePagination } from "./spending-table/SpendingTablePagination";

interface ConnectorEarningTableProps {
  jobs: ConnectorEarningJobGroup[];
  sortBy: string;
  sortOrder: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
  onViewDetail: (id: string) => void;
}

const HEAD_CLASS =
  "h-auto bg-muted/40 px-[18px] py-3.5 text-[10.5px] font-bold uppercase tracking-[0.11em] text-muted-foreground";

/**
 * Connector earnings grouped job → candidate → payout (same wireframe as
 * requester spending). Only one job and one candidate stay expanded at a time.
 */
export function ConnectorEarningTable({
  jobs,
  sortBy,
  sortOrder,
  page,
  limit,
  total,
  totalPages,
  onSort,
  onPageChange,
  onViewDetail,
}: ConnectorEarningTableProps) {
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [openCandidateId, setOpenCandidateId] = useState<string | null>(null);

  useEffect(() => {
    setOpenJobId(null);
    setOpenCandidateId(null);
  }, [page]);

  const handleToggleJob = (jobId: string) => {
    setOpenJobId((current) => (current === jobId ? null : jobId));
    setOpenCandidateId(null);
  };

  const handleToggleCandidate = (candidateId: string) => {
    setOpenCandidateId((current) =>
      current === candidateId ? null : candidateId
    );
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 text-brand-amethyst" />
    ) : (
      <ArrowDown className="h-3 w-3 text-brand-amethyst" />
    );
  };

  return (
    <>
      <Table className="min-w-[900px] table-fixed [&_tr]:hover:bg-transparent">
        <colgroup>
          {EARNING_COLUMN_WIDTHS.map((widthClass) => (
            <col key={widthClass} className={widthClass} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow
            className="border-b border-border hover:bg-transparent [&_button]:text-[10.5px] [&_button]:uppercase [&_button]:tracking-[0.11em] [&_button]:font-bold [&_button]:text-muted-foreground [&_button:hover]:text-foreground"
          >
            <TableHead className={HEAD_CLASS}>Job</TableHead>
            <TableHead className={HEAD_CLASS}>Candidate</TableHead>
            <TableHead className={cn(HEAD_CLASS, "text-right")}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onSort("amount")}
                className="ml-auto flex h-auto items-center gap-2 p-0 transition-colors hover:bg-transparent"
              >
                You Earned {getSortIcon("amount")}
              </Button>
            </TableHead>
            <TableHead
              className={cn(HEAD_CLASS, EARNING_DETAIL_COLUMN_CLASS)}
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => onSort("status")}
                className="flex h-auto items-center gap-2 p-0 transition-colors hover:bg-transparent"
              >
                Status {getSortIcon("status")}
              </Button>
            </TableHead>
            <TableHead
              className={cn(HEAD_CLASS, EARNING_DETAIL_COLUMN_CLASS)}
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => onSort("date")}
                className="flex h-auto items-center gap-2 p-0 transition-colors hover:bg-transparent"
              >
                Date {getSortIcon("date")}
              </Button>
            </TableHead>
            <TableHead
              className={cn(
                HEAD_CLASS,
                "text-center",
                EARNING_DETAIL_COLUMN_CLASS
              )}
            >
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:last-child]:border-b">
          {jobs.map((job) => {
            const jobOpen = openJobId === job.jobId;
            return (
              <Fragment key={job.jobId}>
                <EarningJobRow
                  job={job}
                  open={jobOpen}
                  onToggle={() => handleToggleJob(job.jobId)}
                />
                {jobOpen &&
                  job.candidates.map((candidate) => (
                    <EarningCandidateRow
                      key={candidate.candidateId}
                      candidate={candidate}
                      open={openCandidateId === candidate.candidateId}
                      onToggle={() => handleToggleCandidate(candidate.candidateId)}
                      onViewDetail={onViewDetail}
                    />
                  ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      <SpendingTablePagination
        page={page}
        limit={limit}
        total={total}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  );
}
