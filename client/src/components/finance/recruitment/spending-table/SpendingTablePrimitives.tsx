import { ChevronDown, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SpendingCandidateGroup } from "@/lib/api/recruitment-spending";
import { formatLocalizedDateTimeParts } from "@/utils/dateFormatter";
import {
  getCandidatePendingCount,
  getAvatarGradient,
  getCandidateInitials,
  getTransactionTypeLabel,
  STATUS_CONFIG,
  TRANSACTION_TYPE_TAG_CLASSES,
} from "./spendingTableUtils";

/** Chevron that points right while collapsed and down once the row is open. */
export function RowCaret({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <ChevronDown
      className={cn(
        "shrink-0 text-muted-foreground transition-transform duration-200",
        !open && "-rotate-90",
        className ?? "h-4 w-4"
      )}
      aria-hidden
    />
  );
}

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
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

export function CandidateStatusSummary({
  candidate,
}: {
  candidate: SpendingCandidateGroup;
}) {
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
  return <StatusBadge status="captured" />;
}

export function DateCell({ createdAt }: { createdAt: string | null | undefined }) {
  const parts = createdAt ? formatLocalizedDateTimeParts(createdAt) : null;
  if (!parts) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <span className="whitespace-nowrap font-mono text-xs font-medium text-foreground/80">
      {parts.date}
      <span className="text-muted-foreground"> · {parts.time}</span>
    </span>
  );
}

export function ChargeTypeTag({
  transactionType,
}: {
  transactionType: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-lg border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.07em]",
        TRANSACTION_TYPE_TAG_CLASSES[transactionType] ??
          "border-border bg-muted/60 text-muted-foreground"
      )}
    >
      {getTransactionTypeLabel(transactionType)}
    </span>
  );
}

/** Neutral pill carrying a count, e.g. "4 candidates" or "2 charges". */
export function CountPill({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded-lg border border-border bg-background px-2.5 py-0.5 text-[11.5px] font-bold text-muted-foreground",
        className
      )}
    >
      {label}
    </span>
  );
}

export function CandidateAvatar({
  candidateId,
  label,
  revealed,
}: {
  candidateId: string;
  label: string;
  revealed: boolean;
}) {
  return (
    <span
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-[11.5px] font-bold text-brand-foreground",
        getAvatarGradient(candidateId)
      )}
      aria-hidden
    >
      {getCandidateInitials(label, revealed)}
    </span>
  );
}

/** Rounded elbow that ties a charge row back to its candidate. */
export function ConnectorElbow() {
  return (
    <span
      className="-mt-[9px] mr-2 h-[13px] w-[13px] shrink-0 rounded-bl-[5px] border-b-[1.5px] border-l-[1.5px] border-border"
      aria-hidden
    />
  );
}

export function ViewReceiptButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-[30px] w-[30px] p-0 text-muted-foreground hover:border-brand-amethyst/20 hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label="View transaction details"
    >
      <Eye className="h-[15px] w-[15px]" />
    </Button>
  );
}
