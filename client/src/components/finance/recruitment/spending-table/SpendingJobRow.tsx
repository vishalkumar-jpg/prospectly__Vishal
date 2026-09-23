import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SpendingJobGroup } from "@/lib/api/recruitment-spending";
import { CountPill, DateCell, RowCaret } from "./SpendingTablePrimitives";
import {
  formatOutflow,
  getJobLatestTransaction,
  pluralize,
  SPENDING_DETAIL_COLUMN_CLASS,
} from "./spendingTableUtils";

interface SpendingJobRowProps {
  job: SpendingJobGroup;
  open: boolean;
  onToggle: () => void;
}

/** Hairline top row: white fill, no band tint. */
export function SpendingJobRow({ job, open, onToggle }: SpendingJobRowProps) {
  const latestTransaction = getJobLatestTransaction(job);
  const toggleLabel = `${open ? "Collapse" : "Expand"} job ${job.jobTitle}`;

  return (
    <TableRow
      className={cn(
        "border-y border-border bg-background hover:bg-muted/40",
        "hover:[&>td]:bg-muted/40"
      )}
    >
      <TableCell colSpan={2} className="px-[18px] py-[13px] text-left align-middle">
        <Button
          type="button"
          variant="ghost"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={toggleLabel}
          className="flex h-auto w-full min-w-0 items-center justify-start gap-2.5 p-0 text-left font-normal hover:bg-transparent"
        >
          <RowCaret open={open} className="h-[15px] w-[15px]" />
          <div className="min-w-0 text-left">
            <p className="truncate text-[14.5px] font-medium tracking-[-0.01em] text-foreground">
              {job.jobTitle}
            </p>
            <p className="truncate text-xs font-normal text-muted-foreground">
              {job.companyName}
            </p>
          </div>
          <CountPill label={pluralize(job.candidates.length, "candidate")} />
        </Button>
      </TableCell>
      <TableCell className="px-[18px] py-[13px] text-right align-middle">
        <span className="whitespace-nowrap font-mono text-[15px] font-bold tabular-nums text-brand-gradient">
          {formatOutflow(job.totalAmount)}
        </span>
      </TableCell>
      <TableCell className={cn("px-[18px] py-[13px] align-middle", SPENDING_DETAIL_COLUMN_CLASS)}>
        <span className="text-xs font-semibold text-muted-foreground">
          Job total
        </span>
      </TableCell>
      <TableCell className={cn("px-[18px] py-[13px] align-middle", SPENDING_DETAIL_COLUMN_CLASS)}>
        <DateCell createdAt={latestTransaction?.createdAt} />
      </TableCell>
      <TableCell className={cn("px-[18px] py-[13px] text-center align-middle", SPENDING_DETAIL_COLUMN_CLASS)}>
        <span className="text-xs font-semibold text-muted-foreground">—</span>
      </TableCell>
    </TableRow>
  );
}
