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
  Users,
  Info,
  Check,
  HandCoins,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useConnectorEarningDetail } from "@/hooks/useConnectorEarning";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface ConnectorEarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  earningId: string | null;
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
  queued: { label: "Processing" },
  onboarding_pending: { label: "Awaiting Setup" },
  processing: { label: "Processing" },
  completed: { label: "Paid" },
  failed: { label: "Failed" },
  manual_review: { label: "Under Review" },
};

// Friendly, connector-safe copy for a failure reason. The server never sends
// raw error text — only the safe enum — so there is nothing sensitive to leak.
const FAILURE_REASON_COPY: Record<string, string> = {
  transfer_failed:
    "This payout didn't go through. We'll retry it — no action needed from you.",
  recipient_setup_incomplete:
    "Finish setting up your payout account so we can send this earning.",
  needs_review:
    "This payout is under review by our team. We'll be in touch if anything is needed.",
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
  if (event.includes("Completed"))
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
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

export function ConnectorEarningModal({
  open,
  onOpenChange,
  earningId,
}: ConnectorEarningModalProps) {
  const { detail, loading, error } = useConnectorEarningDetail(
    open ? earningId : null
  );
  const navigate = useNavigate();

  const statusConfig = detail
    ? (STATUS_LABELS[detail.processingStatus] ?? STATUS_LABELS.pending)
    : null;

  // Only render credit rows when there is something meaningful to show — a
  // zero credit line would be visual noise in the breakdown table.
  const creditsApplied = detail ? Number(detail.breakdown.creditsApplied) : 0;
  const creditsRemaining = detail
    ? Number(detail.breakdown.creditsRemainingAfter)
    : 0;
  const showBreakdown =
    !!detail &&
    (detail.breakdown.originalAmount !== null ||
      creditsApplied > 0 ||
      creditsRemaining > 0);

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
              Earning Details
            </DialogTitle>
            {statusConfig && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-foreground/30 bg-brand-foreground/20 px-3 py-1 text-[11px] font-extrabold backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-foreground" />
                {statusConfig.label}
              </span>
            )}
          </div>

          <DialogDescription className="sr-only">
            Connector earning details, payout breakdown and timeline.
          </DialogDescription>

          <div className="relative mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              You&apos;ll Earn
            </p>
            <p className="mt-1 text-3xl font-extrabold leading-none tabular-nums sm:text-4xl">
              {detail?.earnedAmount != null
                ? formatCurrency(detail.earnedAmount)
                : "—"}
            </p>
            {detail && (
              <>
                <p className="mt-2.5 text-sm font-semibold">
                  {detail.jobTitle}
                </p>
                <p className="mt-0.5 text-xs opacity-85">
                  {detail.companyName} · {detail.candidateLabel}
                </p>
              </>
            )}
            {detail?.isShared && (
              <span className="mt-2.5 inline-flex items-center gap-1 rounded-full border border-brand-foreground/30 bg-brand-foreground/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur">
                <Users className="h-2.5 w-2.5" />
                Shared Earning
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        {loading && <LoadingSkeleton />}

        {error && !loading && (
          <div className="flex flex-col items-center gap-3 px-5 py-10">
            <AlertCircle className="h-8 w-8 text-brand-destructive" />
            <p className="text-sm text-muted-foreground">
              Failed to load earning details.
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
            {/* Stripe setup callout */}
            {detail.processingStatus === "onboarding_pending" && (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-brand-warning/30 bg-brand-warning/10 p-4 sm:flex-row sm:items-center">
                <Info className="h-5 w-5 shrink-0 text-brand-warning" />
                <p className="flex-1 text-sm font-semibold text-brand-warning">
                  Complete your Stripe payout setup to receive this payment.
                </p>
                <Button
                  size="sm"
                  className="bg-brand-warning text-brand-foreground hover:bg-brand-warning/90 max-sm:w-full"
                  onClick={() => {
                    onOpenChange(false);
                    navigate("/prospecting/transactions/payouts");
                  }}
                >
                  Complete Setup
                </Button>
              </div>
            )}

            {/* Earning Breakdown */}
            {showBreakdown && (
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Earning Breakdown
                </h4>
                <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {detail.breakdown.originalAmount !== null && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="text-muted-foreground">
                        Original Amount
                      </span>
                      <span className="font-medium tabular-nums text-foreground">
                        {formatCurrency(detail.breakdown.originalAmount)}
                      </span>
                    </div>
                  )}
                  {detail.breakdown.yourShareAmount !== null && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="text-muted-foreground">
                        Your Share
                        {detail.sharePercent
                          ? ` (${Number(detail.sharePercent)}%)`
                          : ""}
                      </span>
                      <span className="font-medium tabular-nums text-foreground">
                        {formatCurrency(detail.breakdown.yourShareAmount)}
                      </span>
                    </div>
                  )}
                  {creditsApplied > 0 && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="text-muted-foreground">
                        Credits Applied
                      </span>
                      <span className="font-medium tabular-nums text-brand-amethyst">
                        -{formatCurrency(detail.breakdown.creditsApplied)}
                      </span>
                    </div>
                  )}
                  {creditsRemaining > 0 && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="text-muted-foreground">
                        Credit Balance Remaining
                      </span>
                      <span className="font-medium tabular-nums text-brand-amethyst">
                        {formatCurrency(detail.breakdown.creditsRemainingAfter)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 bg-muted/50 px-4 py-3 text-sm">
                    <span className="font-semibold text-foreground">
                      You Earned
                    </span>
                    <span className="font-extrabold tabular-nums text-brand-success">
                      {detail.earnedAmount !== null
                        ? formatCurrency(detail.earnedAmount)
                        : "—"}
                    </span>
                  </div>
                </div>
                {detail.breakdown.originalAmount !== null && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    This earning is split because multiple connectors are
                    involved on this candidate.
                  </p>
                )}
              </div>
            )}

            {/* Payout Timeline — vertical stepper */}
            {detail.timeline.length > 0 && (
              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Payout Timeline
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

            {/* Failure reason — friendly copy only, never raw error text */}
            {detail.failureReason && (
              <div className="rounded-xl border border-brand-destructive/30 bg-brand-destructive/10 p-4">
                <p className="flex items-start gap-2 text-sm font-medium text-brand-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {FAILURE_REASON_COPY[detail.failureReason] ??
                      "This payout needs attention. Our team is looking into it."}
                    {detail.retryCount > 0 && (
                      <span className="mt-1 block text-xs opacity-80">
                        Retried {detail.retryCount} time
                        {detail.retryCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
