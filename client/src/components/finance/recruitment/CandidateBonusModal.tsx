import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  Check,
  HandCoins,
  Ban,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCandidateBonusDetail } from "@/hooks/useCandidateBonus";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { cn } from "@/lib/utils";

interface CandidateBonusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bonusId: string | null;
}

function formatCurrency(amount: string | number | null): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

const STATUS_LABELS: Record<string, { label: string }> = {
  pending: { label: "Pending" },
  onboarding_pending: { label: "Awaiting Setup" },
  processing: { label: "Processing" },
  completed: { label: "Paid" },
  failed: { label: "Failed" },
  cancelled: { label: "Cancelled" },
};

interface TimelineStepStyle {
  icon: LucideIcon;
  dotClass: string;
  labelClass: string;
  spin?: boolean;
}

// Maps a timeline event (and whether it has occurred) to brand-token styling.
// Filled dots = completed steps; outline dots = pending/in-progress steps.
function getTimelineStep(event: string, hasDate: boolean): TimelineStepStyle {
  if (event.includes("Cancelled"))
    return {
      icon: Ban,
      dotClass: "border-border bg-muted text-muted-foreground",
      labelClass: "text-muted-foreground",
    };
  if (event.includes("Failed"))
    return {
      icon: XCircle,
      dotClass:
        "border-brand-destructive bg-brand-destructive text-brand-foreground",
      labelClass: "text-brand-destructive",
    };
  if (event.includes("Processing"))
    return {
      icon: Clock,
      dotClass:
        "border-brand-sky bg-card text-brand-sky ring-4 ring-brand-sky/15",
      labelClass: "text-brand-sky",
    };
  if (!hasDate || event.includes("Awaiting"))
    return {
      icon: Info,
      dotClass: "border-brand-warning bg-card text-brand-warning",
      labelClass: "text-brand-warning",
    };
  if (event.includes("Paid"))
    return {
      icon: CheckCircle2,
      dotClass: "border-brand-success bg-brand-success text-brand-foreground",
      labelClass: "text-foreground",
    };
  if (event.includes("Created"))
    return {
      icon: Check,
      dotClass: "border-brand-success bg-brand-success text-brand-foreground",
      labelClass: "text-foreground",
    };
  return {
    icon: Clock,
    dotClass: "border-border bg-card text-muted-foreground",
    labelClass: "text-foreground",
  };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5 px-5 py-5 sm:px-6">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

export function CandidateBonusModal({
  open,
  onOpenChange,
  bonusId,
}: CandidateBonusModalProps) {
  const { detail, loading, error } = useCandidateBonusDetail(
    open ? bonusId : null
  );

  const isCancelled = detail?.payoutStatus === "cancelled";
  const statusKey = isCancelled ? "cancelled" : detail?.processingStatus;
  const statusConfig = statusKey
    ? (STATUS_LABELS[statusKey] ?? STATUS_LABELS.pending)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px] max-sm:rounded-none"
        mobileFullscreen
        hideCloseButton
      >
        {/* Gradient amount-hero header */}
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient px-5 pb-6 pt-5 text-center text-brand-foreground sm:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-brand-foreground/15 text-brand-foreground transition-colors hover:bg-brand-foreground/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <div className="relative flex items-center justify-between gap-3 pr-10">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold tracking-tight">
              <HandCoins className="h-[18px] w-[18px]" />
              Bonus Details
            </DialogTitle>
            {statusConfig && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-foreground/30 bg-brand-foreground/20 px-3 py-1 text-[11px] font-extrabold backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-foreground" />
                {statusConfig.label}
              </span>
            )}
          </div>

          <DialogDescription className="sr-only">
            Candidate bonus details, status timeline and cancellation info.
          </DialogDescription>

          <div className="relative mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              {isCancelled ? "Bonus Cancelled" : "You Earned"}
            </p>
            <p
              className={cn(
                "mt-1 text-3xl font-extrabold leading-none tabular-nums sm:text-4xl",
                isCancelled && "line-through decoration-2 opacity-70"
              )}
            >
              {detail?.earnedAmount == null
                ? "—"
                : formatCurrency(detail.earnedAmount)}
            </p>
            {detail && (
              <>
                <p className="mt-2.5 text-sm font-semibold">
                  {detail.jobTitle}
                </p>
                <p className="mt-0.5 text-xs opacity-85">
                  {detail.companyName}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        {loading && <LoadingSkeleton />}

        {error && !loading && (
          <div className="flex flex-col items-center gap-3 px-5 py-10">
            <AlertCircle className="h-8 w-8 text-brand-destructive" />
            <p className="text-sm text-muted-foreground">
              Failed to load bonus details.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        )}

        {detail && !loading && (
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            {/* Cancellation details */}
            {isCancelled && (
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Ban className="h-3.5 w-3.5" />
                  Cancellation Details
                </h4>
                {detail.cancellationReasonLabel && (
                  <p className="text-sm font-semibold text-foreground">
                    {detail.cancellationReasonLabel}
                  </p>
                )}
                {detail.cancellationNotes && (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">
                    {detail.cancellationNotes}
                  </p>
                )}
                {detail.cancelledAt && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Cancelled on{" "}
                    {formatLocalizedShortDateTime(detail.cancelledAt)}
                  </p>
                )}
              </div>
            )}

            {/* Status Timeline — vertical stepper */}
            {detail.timeline.length > 0 && (
              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Status Timeline
                </h4>
                <ol className="relative pl-7">
                  <span
                    aria-hidden
                    className="absolute bottom-2 left-[11px] top-2 w-px bg-border"
                  />
                  {detail.timeline.map((event, i) => {
                    const step = getTimelineStep(event.event, !!event.date);
                    const Icon = step.icon;
                    return (
                      <li
                        key={i}
                        className="relative flex items-start justify-between gap-3 pb-5 last:pb-0"
                      >
                        <span
                          className={cn(
                            "absolute -left-7 top-0.5 grid h-[18px] w-[18px] place-items-center rounded-full border-2",
                            step.dotClass
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-2.5 w-2.5",
                              step.spin && "animate-spin"
                            )}
                            strokeWidth={3}
                          />
                        </span>
                        <span
                          className={cn(
                            "text-sm font-semibold leading-tight",
                            step.labelClass
                          )}
                        >
                          {event.event}
                        </span>
                        <span className="shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
                          {event.date
                            ? formatLocalizedShortDateTime(event.date)
                            : "—"}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
