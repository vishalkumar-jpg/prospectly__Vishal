import { Fragment, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SpendingJobGroup } from "@/lib/api/recruitment-spending";
import { SpendingCandidateRow } from "./spending-table/SpendingCandidateRow";
import { SpendingJobRow } from "./spending-table/SpendingJobRow";
import { SpendingTablePagination } from "./spending-table/SpendingTablePagination";
import { SPENDING_COLUMN_WIDTHS, SPENDING_DETAIL_COLUMN_CLASS } from "./spending-table/spendingTableUtils";

interface RequesterSpendingTableProps {
  jobs: SpendingJobGroup[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewDetail: (id: string) => void;
}

const HEAD_CLASS =
  "h-auto bg-muted/40 px-[18px] py-3.5 text-[10.5px] font-bold uppercase tracking-[0.11em] text-muted-foreground";

/**
 * Requester spending grouped job → candidate → charge (hairline & rail wireframe).
 * Only one job and one candidate stay expanded at a time.
 */
export function RequesterSpendingTable({
  jobs,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onViewDetail,
}: RequesterSpendingTableProps) {
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [openCandidateId, setOpenCandidateId] = useState<string | null>(null);

  useEffect(() => {
    setOpenJobId(null);
    setOpenCandidateId(null);
  }, [page]);

  const toggleJob = (jobId: string) => {
    setOpenJobId((current) => (current === jobId ? null : jobId));
    setOpenCandidateId(null);
  };

  const toggleCandidate = (candidateId: string) => {
    setOpenCandidateId((current) =>
      current === candidateId ? null : candidateId
    );
  };

  return (
    <>
      <Table className="min-w-[900px] table-fixed [&_tr]:hover:bg-transparent">
        <colgroup>
          {SPENDING_COLUMN_WIDTHS.map((widthClass) => (
            <col key={widthClass} className={widthClass} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow className="border-b border-border hover:bg-transparent">
            <TableHead className={HEAD_CLASS}>Job</TableHead>
            <TableHead className={HEAD_CLASS}>Candidate</TableHead>
            <TableHead className={cn(HEAD_CLASS, "text-right")}>Amount</TableHead>
            <TableHead className={cn(HEAD_CLASS, SPENDING_DETAIL_COLUMN_CLASS)}>
              Status
            </TableHead>
            <TableHead className={cn(HEAD_CLASS, SPENDING_DETAIL_COLUMN_CLASS)}>
              Date
            </TableHead>
            <TableHead className={cn(HEAD_CLASS, "text-center", SPENDING_DETAIL_COLUMN_CLASS)}>
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:last-child]:border-b">
          {jobs.map((job) => {
            const jobOpen = openJobId === job.jobId;
            return (
              <Fragment key={job.jobId}>
                <SpendingJobRow
                  job={job}
                  open={jobOpen}
                  onToggle={() => toggleJob(job.jobId)}
                />
                {jobOpen &&
                  job.candidates.map((candidate) => (
                    <SpendingCandidateRow
                      key={candidate.candidateId}
                      candidate={candidate}
                      open={openCandidateId === candidate.candidateId}
                      onToggle={() => toggleCandidate(candidate.candidateId)}
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
