import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SpendingTransaction } from "@/lib/api/recruitment-spending";
import {
  ChargeTypeTag,
  ConnectorElbow,
  DateCell,
  StatusBadge,
  ViewReceiptButton,
} from "./SpendingTablePrimitives";
import { formatOutflow, SPENDING_DETAIL_COLUMN_CLASS } from "./spendingTableUtils";

interface SpendingTransactionRowProps {
  transaction: SpendingTransaction;
  onViewDetail: (id: string) => void;
}

/** Hairline leaf row: white fill, light hairline divider, amethyst rail on tag. */
export function SpendingTransactionRow({
  transaction,
  onViewDetail,
}: SpendingTransactionRowProps) {
  return (
    <TableRow className="border-b border-border bg-background hover:bg-muted/40">
      <TableCell className="py-[13px] pl-[66px] pr-[18px] align-middle">
        <div className="flex min-w-0 items-center">
          <ConnectorElbow />
          <ChargeTypeTag transactionType={transaction.transactionType} />
        </div>
      </TableCell>
      <TableCell className="px-[18px] py-[13px] align-middle">
        <span className="truncate font-mono text-xs font-semibold text-muted-foreground">
          #{transaction.id.slice(0, 8).toUpperCase()}
        </span>
      </TableCell>
      <TableCell className="px-[18px] py-[13px] text-right align-middle">
        <span className="whitespace-nowrap font-mono text-[13px] font-bold tabular-nums text-foreground">
          {formatOutflow(transaction.totalAmount)}
        </span>
      </TableCell>
      <TableCell className={cn("px-[18px] py-[13px] align-middle", SPENDING_DETAIL_COLUMN_CLASS)}>
        <StatusBadge status={transaction.status} />
      </TableCell>
      <TableCell className={cn("px-[18px] py-[13px] align-middle", SPENDING_DETAIL_COLUMN_CLASS)}>
        <DateCell createdAt={transaction.createdAt} />
      </TableCell>
      <TableCell className={cn("px-[18px] py-[13px] text-center align-middle", SPENDING_DETAIL_COLUMN_CLASS)}>
        <ViewReceiptButton onClick={() => onViewDetail(transaction.id)} />
      </TableCell>
    </TableRow>
  );
}
