import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Ban,
} from "lucide-react";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import type { CandidateBonus } from "@/lib/api/candidate-bonus";

interface CandidateBonusTableProps {
  bonuses: CandidateBonus[];
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

function formatCurrency(amount: string | number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

/**
 * Status config — mirrors the connector/requester tables so badges read the
 * same way across all three recruitment finance tabs. Each entry pairs a
 * color family with an icon so color is never the sole indicator (per UX
 * design system rules). `cancelled` is candidate-specific.
 */
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    className: string;
    Icon: typeof Clock;
    tooltip?: string;
  }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    Icon: Clock,
  },
  onboarding_pending: {
    label: "Awaiting Setup",
    className: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    Icon: AlertCircle,
    tooltip: "Complete your payout account to receive this bonus.",
  },
  queued: {
    label: "Processing",
    className: "bg-blue-500/15 text-blue-700 border-blue-500/30",
    Icon: Clock,
  },
  processing: {
    label: "Processing",
    className: "bg-blue-500/15 text-blue-700 border-blue-500/30",
    Icon: Clock,
  },
  completed: {
    label: "Paid",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    Icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/15 text-red-700 border-red-500/30",
    Icon: XCircle,
  },
  manual_review: {
    label: "Under Review",
    className: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    Icon: AlertCircle,
    tooltip: "This bonus is under review by our team.",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-500/15 text-slate-700 border-slate-500/30",
    Icon: Ban,
    tooltip: "This bonus was cancelled. Open details to see why.",
  },
};

/** Cancelled is tracked on the payout status, not the processing status. */
function resolveStatusKey(bonus: CandidateBonus): string {
  return bonus.payoutStatus === "cancelled"
    ? "cancelled"
    : bonus.processingStatus;
}

function StatusBadge({ statusKey }: { statusKey: string }) {
  const config = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
  const Icon = config.Icon;
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "font-medium text-xs px-2 py-1 whitespace-nowrap inline-flex items-center gap-1",
        config.className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );

  if (!config.tooltip) return badge;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{badge}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          {config.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function CandidateBonusTable({
  bonuses,
  sortBy,
  sortOrder,
  page,
  limit,
  total,
  totalPages,
  onSort,
  onPageChange,
  onViewDetail,
}: CandidateBonusTableProps) {
  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent [&_button]:text-[11px] [&_button]:uppercase [&_button]:tracking-wider [&_button]:font-bold [&_button]:text-muted-foreground [&_button:hover]:text-foreground">
              <TableHead className="min-w-[180px] text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                Job
              </TableHead>
              <TableHead className="min-w-[150px] text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                Company
              </TableHead>
              <TableHead className="min-w-[140px]">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onSort("amount")}
                  className="flex h-auto items-center gap-1.5 p-0 transition-colors hover:bg-transparent"
                >
                  You Earned {getSortIcon("amount")}
                </Button>
              </TableHead>
              <TableHead className="min-w-[140px]">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onSort("status")}
                  className="flex h-auto items-center gap-1.5 p-0 transition-colors hover:bg-transparent"
                >
                  Status {getSortIcon("status")}
                </Button>
              </TableHead>
              <TableHead className="min-w-[140px]">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onSort("date")}
                  className="flex h-auto items-center gap-1.5 p-0 transition-colors hover:bg-transparent"
                >
                  Date {getSortIcon("date")}
                </Button>
              </TableHead>
              <TableHead className="min-w-[70px] text-center text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bonuses.map((bonus) => (
              <TableRow
                key={bonus.id}
                className="group border-b border-border/50 transition-colors hover:bg-brand-amethyst/5"
              >
                <TableCell className="py-4">
                  <span className="font-medium text-foreground">
                    {bonus.jobTitle}
                  </span>
                </TableCell>
                <TableCell className="py-4">
                  <span className="text-sm text-muted-foreground">
                    {bonus.companyName}
                  </span>
                </TableCell>
                <TableCell className="py-4">
                  {bonus.earnedAmount === null ? (
                    <span className="font-semibold text-sm text-muted-foreground">
                      —
                    </span>
                  ) : bonus.payoutStatus === "cancelled" ? (
                    // Voided bonus — strike through in neutral slate so it never
                    // reads as a successful (green) payout.
                    <span className="font-semibold text-sm text-muted-foreground line-through decoration-1">
                      {formatCurrency(bonus.earnedAmount)}
                    </span>
                  ) : (
                    <span className="font-semibold text-sm text-emerald-600">
                      {formatCurrency(bonus.earnedAmount)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-4">
                  <StatusBadge statusKey={resolveStatusKey(bonus)} />
                </TableCell>
                <TableCell className="py-4">
                  <span className="text-sm text-foreground whitespace-nowrap">
                    {formatLocalizedShortDateTime(bonus.createdAt)}
                  </span>
                </TableCell>
                <TableCell className="py-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onViewDetail(bonus.id)}
                    aria-label="View bonus details"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 px-1">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">
            {(page - 1) * limit + 1}
          </span>{" "}
          to{" "}
          <span className="font-medium text-foreground">
            {Math.min(page * limit, total)}
          </span>{" "}
          of <span className="font-medium text-foreground">{total}</span>{" "}
          bonuses
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Previous</span>
          </Button>
          <div className="flex items-center gap-1 px-2">
            {Array.from({ length: Math.min(5, totalPages || 1) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0",
                    page === pageNum
                      ? "border-transparent bg-brand-gradient text-brand-foreground shadow-brand-cta hover:text-brand-foreground"
                      : "hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                  )}
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <span className="hidden sm:inline mr-1">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
