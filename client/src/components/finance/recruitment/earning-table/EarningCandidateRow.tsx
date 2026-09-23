import { Fragment } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConnectorEarningCandidateGroup } from "@/lib/api/connector-earning";
import {
  CandidateAvatar,
  CandidateEarningStatusSummary,
  DateCell,
  RowCaret,
} from "./EarningTablePrimitives";
import { EarningPayoutRow } from "./EarningPayoutRow";
import {
  EARNING_DETAIL_COLUMN_CLASS,
  formatInflow,
  getLatestPayout,
} from "./earningTableUtils";

interface EarningCandidateRowProps {
  candidate: ConnectorEarningCandidateGroup;
  open: boolean;
  onToggle: () => void;
  onViewDetail: (id: string) => void;
}

export function EarningCandidateRow({
  candidate,
  open,
  onToggle,
  onViewDetail,
}: EarningCandidateRowProps) {
  const latestPayout = getLatestPayout(candidate);
  const toggleLabel = `${open ? "Collapse" : "Expand"} earnings for ${candidate.candidateLabel}`;

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
              revealed={false}
            />
            <div className="min-w-0 text-left">
              <p className="truncate text-[13.5px] font-medium text-foreground">
                {candidate.candidateLabel}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell className="px-[18px] py-[13px] text-right align-middle">
          <span className="whitespace-nowrap font-mono text-[13px] font-bold tabular-nums text-brand-success">
            {formatInflow(candidate.totalAmount)}
          </span>
        </TableCell>
        <TableCell
          className={cn("px-[18px] py-[13px] align-middle", EARNING_DETAIL_COLUMN_CLASS)}
        >
          <CandidateEarningStatusSummary candidate={candidate} />
        </TableCell>
        <TableCell
          className={cn("px-[18px] py-[13px] align-middle", EARNING_DETAIL_COLUMN_CLASS)}
        >
          <DateCell createdAt={latestPayout?.createdAt} />
        </TableCell>
        <TableCell
          className={cn(
            "px-[18px] py-[13px] text-center align-middle",
            EARNING_DETAIL_COLUMN_CLASS
          )}
        >
          <span className="text-xs font-semibold text-muted-foreground">—</span>
        </TableCell>
      </TableRow>

      {open &&
        candidate.earnings.map((payout) => (
          <EarningPayoutRow
            key={payout.id}
            payout={payout}
            onViewDetail={onViewDetail}
          />
        ))}
    </Fragment>
  );
}
