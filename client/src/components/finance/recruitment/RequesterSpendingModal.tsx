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
  ExternalLink,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Coins,
  Check,
  Info,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRequesterSpendingDetail } from "@/hooks/useRequesterSpending";
import { formatLocalizedDateTimeParts } from "@/utils/dateFormatter";
import { cn } from "@/lib/utils";

interface RequesterSpendingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string | null;
}

function formatCurrency(amount: string | number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

const STATUS_LABELS: Record<string, { label: string; showCheck?: boolean }> = {
  pending: { label: "Pending" },
  authorized: { label: "Authorized" },
  captured: { label: "Paid", showCheck: true },
  cancelled: { label: "Cancelled" },
};

interface TimelineStepStyle {
  icon: LucideIcon;
  dotClass: string;
  labelClass: string;
}

// Maps a payment timeline event (and whether it has occurred) to brand-token
// styling. Filled dots = completed steps; outline dots = pending steps.
function getTimelineStep(event: string, hasDate: boolean): TimelineStepStyle {
  if (event.includes("Cancelled"))
    return {
      icon: XCircle,
      dotClass:
        "border-brand-destructive bg-brand-destructive text-brand-foreground",
      labelClass: "text-brand-destructive",
    };
  if (!hasDate)
    return {
      icon: Info,
      dotClass: "border-brand-warning bg-card text-brand-warning",
      labelClass: "text-brand-warning",
    };
  if (event.includes("Captured"))
    return {
      icon: CheckCircle2,
      dotClass: "border-brand-success bg-brand-success text-brand-foreground",
      labelClass: "text-foreground",
    };
  if (event.includes("Authorized"))
    return {
      icon: CreditCard,
      dotClass: "border-brand-sky bg-brand-sky text-brand-foreground",
      labelClass: "text-brand-sky",
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

export function RequesterSpendingModal({
  open,
  onOpenChange,
  transactionId,
}: RequesterSpendingModalProps) {
  const { detail, loading, error } = useRequesterSpendingDetail(
    open ? transactionId : null
  );

  const statusConfig = detail
    ? STATUS_LABELS[detail.status] || STATUS_LABELS.pending
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[720px] max-sm:rounded-none"
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
              <CreditCard className="h-[18px] w-[18px]" />
              Payment Details
            </DialogTitle>
            {statusConfig && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-foreground/30 bg-brand-foreground/20 px-3 py-1 text-[11px] font-extrabold backdrop-blur">
                {statusConfig.showCheck ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-foreground" />
                )}
                {statusConfig.label}
              </span>
            )}
          </div>

          <DialogDescription className="sr-only">
            Requester payment details, charge breakdown and timeline.
          </DialogDescription>

          <div className="relative mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              Total Charged
            </p>
            <p className="mt-1 text-3xl font-extrabold leading-none tabular-nums sm:text-4xl">
              {detail ? formatCurrency(detail.totalAmount) : "—"}
            </p>
            {detail && (
              <>
                {detail.transactionType === "flat_deposit" && (
                  <p className="mt-2 inline-flex items-center rounded-full border border-brand-foreground/30 bg-brand-foreground/15 px-2.5 py-0.5 text-[11px] font-bold backdrop-blur">
                    One-time referral deposit
                  </p>
                )}
                {detail.transactionType === "flat_topup" && (
                  <p className="mt-2 inline-flex items-center rounded-full border border-brand-foreground/30 bg-brand-foreground/15 px-2.5 py-0.5 text-[11px] font-bold backdrop-blur">
                    Referral fee top-up
                  </p>
                )}
                {detail.transactionType === "success_fee" && (
                  <p className="mt-2 inline-flex items-center rounded-full border border-brand-foreground/30 bg-brand-foreground/15 px-2.5 py-0.5 text-[11px] font-bold backdrop-blur">
                    Candidate success fee
                  </p>
                )}
                {detail.transactionType === "success_fee_topup" && (
                  <p className="mt-2 inline-flex items-center rounded-full border border-brand-foreground/30 bg-brand-foreground/15 px-2.5 py-0.5 text-[11px] font-bold backdrop-blur">
                    Success fee top-up
                  </p>
                )}
                <p className="mt-2.5 text-sm font-semibold">
                  {detail.jobTitle}
                </p>
                <p className="mt-0.5 text-xs opacity-85">
                  {detail.companyName} · {detail.candidateLabel}
                  {detail.candidateEmail ? ` · ${detail.candidateEmail}` : ""}
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
              Failed to load transaction details.
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
            {/* Two-pane: Breakdown | Timeline */}
            <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
              {/* Breakdown */}
              {detail.breakdown && (
                <div className="flex flex-col">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-amethyst/10 text-brand-amethyst">
                      <Coins className="h-4 w-4" />
                    </span>
                    Breakdown
                  </h4>
                  <div className="flex flex-1 flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
                    <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="text-muted-foreground">
                        Interview Cost
                      </span>
                      <span className="font-semibold tabular-nums text-brand-amethyst">
                        {formatCurrency(detail.breakdown.bountyAmount)}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="text-muted-foreground">
                        Stripe Processing Fee
                      </span>
                      <span className="font-medium tabular-nums text-foreground">
                        {formatCurrency(
                          Number(detail.breakdown.providerFee) +
                            Number(detail.breakdown.processingFee)
                        )}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-3 bg-muted/50 px-4 py-3 text-sm">
                      <span className="font-semibold text-foreground">
                        Total Charged
                      </span>
                      <span className="font-extrabold tabular-nums text-brand-amethyst">
                        {formatCurrency(detail.breakdown.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline — vertical stepper */}
              {detail.timeline.length > 0 && (
                <div className="flex flex-col">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-sky/15 text-brand-sky">
                      <Clock className="h-4 w-4" />
                    </span>
                    Timeline
                  </h4>
                  <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border p-4">
                    <div className="relative flex-1 pl-6">
                      <span
                        aria-hidden
                        className="absolute bottom-[9px] left-[11px] top-[9px] w-px bg-border"
                      />
                      <ol>
                        {detail.timeline.map((event, i) => {
                          const step = getTimelineStep(
                            event.event,
                            !!event.date
                          );
                          const Icon = step.icon;
                          const dateParts = event.date
                            ? formatLocalizedDateTimeParts(event.date)
                            : null;
                          return (
                            <li
                              key={i}
                              className="relative flex items-start justify-between gap-3 pb-5 last:pb-0"
                            >
                              <span
                                className={cn(
                                  "absolute -left-[22px] top-0.5 grid h-[18px] w-[18px] place-items-center rounded-full border-2",
                                  step.dotClass
                                )}
                              >
                                <Icon className="h-2.5 w-2.5" strokeWidth={3} />
                              </span>
                              <span
                                className={cn(
                                  "min-w-0 flex-1 truncate pr-2 text-sm font-semibold leading-tight",
                                  step.labelClass
                                )}
                              >
                                {event.event}
                              </span>
                              <div className="shrink-0 text-right tabular-nums text-muted-foreground">
                                {dateParts ? (
                                  <>
                                    <span className="block text-xs font-medium leading-tight">
                                      {dateParts.date}
                                    </span>
                                    <span className="block text-[11px] leading-tight opacity-80">
                                      {dateParts.time}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xs font-medium">—</span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Error */}
            {detail.paymentError && (
              <div className="rounded-xl border border-brand-destructive/30 bg-brand-destructive/10 p-4">
                <p className="flex items-start gap-2 text-sm font-medium text-brand-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{detail.paymentError}</span>
                </p>
              </div>
            )}

            {/* Footer: Receipt */}
            {detail.receiptUrl && detail.status === "captured" && (
              <div className="flex justify-end border-t border-border pt-4">
                <Button
                  size="sm"
                  className="bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
                  asChild
                >
                  <a
                    href={detail.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    View Stripe Receipt
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
