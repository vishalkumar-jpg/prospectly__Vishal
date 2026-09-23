import { Fragment } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SpendingCandidateGroup } from "@/lib/api/recruitment-spending";
import {
  CandidateAvatar,
  CandidateStatusSummary,
  DateCell,
  RowCaret,
} from "./SpendingTablePrimitives";
import { SpendingTransactionRow } from "./SpendingTransactionRow";
import {
  formatOutflow,
  getLatestTransaction,
  HIDDEN_IDENTITY_LABEL,
  SPENDING_DETAIL_COLUMN_CLASS,
} from "./spendingTableUtils";

interface SpendingCandidateRowProps {
  candidate: SpendingCandidateGroup;
  open: boolean;
  onToggle: () => void;
  onViewDetail: (id: string) => void;
}

/** Hairline middle row: white fill, muted highlight only when expanded. */
export function SpendingCandidateRow({
  candidate,
  open,
  onToggle,
  onViewDetail,
}: SpendingCandidateRowProps) {
  const revealed = Boolean(candidate.candidateEmail);
  const latestTransaction = getLatestTransaction(candidate);
  const toggleLabel = `${open ? "Collapse" : "Expand"} charges for ${candidate.candidateLabel}`;

  return (
    <Fragment>
      <TableRow
        className={cn(
          "border-b border-border bg-background hover:bg-muted/40",
          open && "bg-muted/40 hover:bg-muted/40"
        )}
      >
        <TableCell className="py-[13px] pl-[42px] pr-[18px] align-middle">
          <Button
            type="button"
            variant="ghost"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={toggleLabel}
            className="flex h-auto min-w-0 items-center justify-start gap-2.5 p-0 font-normal hover:bg-transparent"
          >
            <RowCaret open={open} className="h-[15px] w-[15px]" />
          </Button>
        </TableCell>
        <TableCell className="px-[18px] py-[13px] align-middle">
          <div className="flex min-w-0 items-center gap-2.5">
            <CandidateAvatar
              candidateId={candidate.candidateId}
              label={candidate.candidateLabel}
              revealed={revealed}
            />
            <div className="min-w-0 text-left">
              <p className="truncate text-[13.5px] font-medium text-foreground">
                {candidate.candidateLabel}
              </p>
              <p className="truncate text-[11.5px] text-muted-foreground">
                {candidate.candidateEmail ?? HIDDEN_IDENTITY_LABEL}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell className="px-[18px] py-[13px] text-right align-middle">
          <span className="whitespace-nowrap font-mono text-[13px] font-bold tabular-nums text-foreground">
            {formatOutflow(candidate.totalAmount)}
          </span>
        </TableCell>
        <TableCell className={cn("px-[18px] py-[13px] align-middle", SPENDING_DETAIL_COLUMN_CLASS)}>
          <CandidateStatusSummary candidate={candidate} />
        </TableCell>
        <TableCell className={cn("px-[18px] py-[13px] align-middle", SPENDING_DETAIL_COLUMN_CLASS)}>
          <DateCell createdAt={latestTransaction?.createdAt} />
        </TableCell>
        <TableCell className={cn("px-[18px] py-[13px] text-center align-middle", SPENDING_DETAIL_COLUMN_CLASS)}>
          <span className="text-xs font-semibold text-muted-foreground">—</span>
        </TableCell>
      </TableRow>

      {open &&
        candidate.transactions.map((transaction) => (
          <SpendingTransactionRow
            key={transaction.id}
            transaction={transaction}
            onViewDetail={onViewDetail}
          />
        ))}
    </Fragment>
  );
}
