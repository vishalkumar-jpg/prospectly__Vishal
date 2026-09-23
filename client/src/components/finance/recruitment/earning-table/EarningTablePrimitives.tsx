import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConnectorEarningCandidateGroup } from "@/lib/api/connector-earning";
import {
  EARNING_STATUS_CONFIG,
  getCandidatePendingCount,
} from "./earningTableUtils";
import {
  CandidateAvatar,
  ConnectorElbow,
  CountPill,
  DateCell,
  RowCaret,
} from "../spending-table/SpendingTablePrimitives";

export { RowCaret, DateCell, CandidateAvatar, ConnectorElbow, CountPill };

export function EarningStatusBadge({ status }: { status: string }) {
  const config = EARNING_STATUS_CONFIG[status] ?? EARNING_STATUS_CONFIG.pending;
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap px-2.5 py-1 text-[11px] font-bold",
        config.className
      )}
    >
      {config.label}
    </Badge>
  );
}

export function CandidateEarningStatusSummary({
  candidate,
}: {
  candidate: ConnectorEarningCandidateGroup;
}) {
  const unresolved = candidate.earnings.filter(
    (payout) => payout.processingStatus !== "completed"
  );

  if (unresolved.length === 0) {
    return <EarningStatusBadge status="completed" />;
  }

  const pendingCount = getCandidatePendingCount(candidate);
  if (pendingCount > 0) {
    return (
      <Badge
        variant="outline"
        className="whitespace-nowrap border-brand-warning/30 bg-brand-warning/15 px-2.5 py-1 text-[11px] font-bold text-brand-warning"
      >
        {pendingCount} pending
      </Badge>
    );
  }

  return <EarningStatusBadge status={unresolved[0].processingStatus} />;
}

export function ViewEarningButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 w-7 p-0"
      onClick={onClick}
      aria-label="View earning details"
    >
      <Eye className="h-3.5 w-3.5" />
    </Button>
  );
}
