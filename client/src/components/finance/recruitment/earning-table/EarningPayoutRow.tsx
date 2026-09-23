import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConnectorEarningPayoutItem } from "@/lib/api/connector-earning";
import {
  ConnectorElbow,
  DateCell,
  EarningStatusBadge,
  ViewEarningButton,
} from "./EarningTablePrimitives";
import { EARNING_DETAIL_COLUMN_CLASS, formatInflow } from "./earningTableUtils";

interface EarningPayoutRowProps {
  payout: ConnectorEarningPayoutItem;
  onViewDetail: (id: string) => void;
}

export function EarningPayoutRow({ payout, onViewDetail }: EarningPayoutRowProps) {
  const creditsApplied = Number(payout.creditsApplied ?? 0);

  return (
    <TableRow className="border-b border-border bg-background hover:bg-muted/40">
      <TableCell className="py-[13px] pl-[66px] pr-[18px] align-middle">
        <div className="flex min-w-0 items-center">
          <ConnectorElbow />
          <Badge
            variant="outline"
            className="border-border bg-muted/60 px-2.5 py-1 text-[11px] font-bold text-muted-foreground"
          >
            Payout
          </Badge>
        </div>
      </TableCell>
      <TableCell className="px-[18px] py-[13px] align-middle">
        <span className="truncate font-mono text-xs font-semibold text-muted-foreground">
          #{payout.id.slice(0, 8).toUpperCase()}
        </span>
      </TableCell>
      <TableCell className="px-[18px] py-[13px] text-right align-middle">
        <div className="flex flex-col items-end gap-1">
          <span className="whitespace-nowrap font-mono text-[13px] font-bold tabular-nums text-brand-success">
            {payout.earnedAmount !== null ? formatInflow(payout.earnedAmount) : "—"}
          </span>
          {creditsApplied > 0 && (
            <span className="inline-flex items-center rounded border border-brand-amethyst/30 bg-brand-amethyst/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-amethyst">
              – {formatInflow(payout.creditsApplied)} credit
            </span>
          )}
        </div>
      </TableCell>
      <TableCell
        className={cn("px-[18px] py-[13px] align-middle", EARNING_DETAIL_COLUMN_CLASS)}
      >
        <div className="flex flex-col items-start gap-1">
          <EarningStatusBadge status={payout.processingStatus} />
          {payout.isShared && (
            <Badge
              variant="outline"
              className="inline-flex items-center gap-1 border-brand-amethyst/30 bg-brand-amethyst/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-amethyst"
            >
              <Users className="h-2.5 w-2.5" />
              Shared
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell
        className={cn("px-[18px] py-[13px] align-middle", EARNING_DETAIL_COLUMN_CLASS)}
      >
        <DateCell createdAt={payout.createdAt} />
      </TableCell>
      <TableCell
        className={cn(
          "px-[18px] py-[13px] text-center align-middle",
          EARNING_DETAIL_COLUMN_CLASS
        )}
      >
        <ViewEarningButton onClick={() => onViewDetail(payout.id)} />
      </TableCell>
    </TableRow>
  );
}
