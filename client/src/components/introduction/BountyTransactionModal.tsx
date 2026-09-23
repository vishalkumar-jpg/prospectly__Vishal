import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DollarSign,
  TrendingUp,
  Banknote,
  Wallet,
  AlertCircle,
  Star,
  Mail,
  Calendar,
  CreditCard,
  X,
  Receipt,
  ExternalLink,
  Ban,
  BarChart3,
} from "lucide-react";
import { useRequestTransactionDetails } from "@/hooks/useTransactionHistory";
import { RequesterFeeBreakdown } from "./RequesterFeeBreakdown";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BountyTransactionRefundInfo } from "./BountyTransactionRefundInfo";
import { BountyTransactionPaymentTimeline } from "./BountyTransactionPaymentTimeline";
import {
  formatCurrency,
  getStatusBadge,
} from "./bounty-transaction-display.utils";

interface BountyTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  introductionRequestId: string;
  prospectName?: string;
}

const POST_REFUND_CHARGE_STATUSES = [
  "refund_initiated",
  "refunded",
];

function isPostRefundChargeStatus(status: string | null | undefined): boolean {
  return (
    !!status && POST_REFUND_CHARGE_STATUSES.includes(status)
  );
}

export function BountyTransactionModal({
  open,
  onOpenChange,
  introductionRequestId,
  prospectName = "Introduction",
}: BountyTransactionModalProps) {
  const { details, loading, error } = useRequestTransactionDetails(
    open ? introductionRequestId : ""
  );

  const isRequester = details?.userRole === "requester";
  // const isConnector = details?.userRole === "connector";

  const initialInRefundState = isPostRefundChargeStatus(
    details?.initialChargeStatus
  );
  const initialSummaryAmount = details?.initialChargeAmount ?? 0;
  const remainingSummaryAmount = details?.remainingChargeAmount ?? 0;
  const initialFeesRetained =
    initialInRefundState && details?.initialRefundAmount != null
      ? Math.max(
        0,
        (details.initialChargeAmount ?? 0) - details.initialRefundAmount
      )
      : 0;

  const getTrustScoreStatus = () => {
    if (!details) return null;

    const trustScore = details.connectorTrustScoreAtPayout;
    if (trustScore === null || trustScore === undefined) {
      return {
        eligible: false,
        message: "Trust score will be evaluated upon meeting completion",
        color: "text-muted-foreground",
      };
    }

    if (trustScore >= 90) {
      return {
        eligible: true,
        message: `Trust Score: ${trustScore} - Qualifies for immediate payout`,
        color: "text-brand-success",
      };
    }

    return {
      eligible: false,
      message: `Trust Score: ${trustScore} - Payout after peer feedback`,
      color: "text-brand-warning",
    };
  };

  const trustStatus = getTrustScoreStatus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        data-testid="bounty-transaction-modal"
        mobileFullscreen
        hideCloseButton
      >
        {/* Hero */}
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-5 text-white sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-3.5 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg font-extrabold tracking-tight text-white sm:text-xl">
                Payment Details
              </DialogTitle>
              <DialogDescription asChild>
                <div className="mt-1 truncate text-[13px] leading-relaxed text-white/90">
                  {prospectName}
                  {" — "}
                  {isRequester
                    ? "Track your payment status and deductions"
                    : "View your earnings and payout details"}
                </div>
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
              <p>Failed to load transaction details</p>
              <p className="text-sm">Please try again later</p>
            </div>
          ) : details ? (
            <div className="space-y-5">
              {/* ===== Payment Summary section ===== */}
              <section className="rounded-2xl border border-primary/15 bg-primary/[0.05] p-5">
                <h3 className="mb-4 flex items-center gap-2.5 text-base font-semibold">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-background text-primary">
                    <BarChart3 className="h-4 w-4" />
                  </span>
                  Payment Summary
                </h3>

                {isRequester ? (
                  <>
                    {/* Requester Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                          <DollarSign className="h-4 w-4" />
                        </span>
                        <div className="text-xs font-semibold text-muted-foreground">
                          Total Referral Payout
                        </div>
                        <div
                          className="mt-1 text-xl sm:text-2xl font-bold tabular-nums"
                          data-testid="text-total-bounty"
                        >
                          {formatCurrency(
                            details.requesterTotalAmount ?? details.bountyAmount
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Amount committed
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-card p-3 sm:p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-brand-rose/10 text-brand-rose">
                          <Mail className="h-4 w-4" />
                        </span>
                        <div className="text-xs font-semibold text-muted-foreground">
                          {details.initialChargePercentage}% Initial
                        </div>
                        <div
                          className="mt-1 text-xl sm:text-2xl font-bold tabular-nums"
                          data-testid="text-initial-charge"
                        >
                          {formatCurrency(initialSummaryAmount)}
                        </div>
                        {initialInRefundState &&
                          details.initialRefundAmount != null && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatCurrency(details.initialRefundAmount)}{" "}
                            {details.initialChargeStatus === "refunded"
                              ? "refunded"
                              : "refund pending"}
                            {initialFeesRetained > 0 && (
                              <>
                                {" "}
                                · {formatCurrency(initialFeesRetained)} fees
                                retained
                              </>
                            )}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-1">
                          {getStatusBadge(details.initialChargeStatus)}
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-card p-3 sm:p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-brand-success/10 text-brand-success">
                          <Calendar className="h-4 w-4" />
                        </span>
                        <div className="text-xs font-semibold text-muted-foreground">
                          {details.remainingChargePercentage}% Remaining
                        </div>
                        <div
                          className="mt-1 text-xl sm:text-2xl font-bold tabular-nums"
                          data-testid="text-remaining-charge"
                        >
                          {formatCurrency(remainingSummaryAmount)}
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          {getStatusBadge(details.remainingChargeStatus)}
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-card p-3 sm:p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-brand-warning/10 text-brand-warning">
                          <TrendingUp className="h-4 w-4" />
                        </span>
                        <div className="text-xs font-semibold text-muted-foreground">
                          Total Charged
                        </div>
                        <div
                          className="mt-1 text-xl sm:text-2xl font-bold tabular-nums"
                          data-testid="text-total-charged"
                        >
                          {formatCurrency(
                            (details.paymentEvents.find(
                              (e) => e.type === "initial_capture"
                            )?.status === "captured"
                              ? details.initialChargeAmount
                              : 0) +
                            (details.paymentEvents.find(
                              (e) => e.type === "remaining_capture"
                            )?.status === "captured"
                              ? details.remainingChargeAmount
                              : 0)
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Of{" "}
                          {formatCurrency(
                            details.requesterTotalAmount ?? details.bountyAmount
                          )}
                        </div>
                      </div>
                    </div>

                    {details.providerFee != null &&
                      details.processingFee != null &&
                      details.requesterTotalAmount != null && (
                        <RequesterFeeBreakdown
                          referralPayout={details.bountyAmount}
                          providerFee={details.providerFee}
                          processingFee={details.processingFee}
                          totalAmount={details.requesterTotalAmount}
                          initialChargeAmount={details.initialChargeAmount}
                          remainingChargeAmount={details.remainingChargeAmount}
                          showMilestones={false}
                          className="mt-4"
                        />
                      )}
                  </>
                ) : (
                  /* Connector Summary Cards */
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className="rounded-2xl border bg-card p-3 sm:p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                        <DollarSign className="h-4 w-4" />
                      </span>
                      <div className="text-xs font-semibold text-muted-foreground">
                        Gross Earnings
                      </div>
                      <div
                        className="mt-1 text-xl sm:text-2xl font-bold tabular-nums"
                        data-testid="text-gross-earnings"
                      >
                        {formatCurrency(details.bountyAmount)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Total referral payout amount
                      </div>
                    </div>

                    <div className="hidden rounded-2xl border bg-card p-3 sm:p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
                        <Banknote className="h-4 w-4" />
                      </span>
                      <div className="text-xs font-semibold text-muted-foreground">
                        Escrow Fee ({details.platformCommissionPercentage}%)
                      </div>
                      <div
                        className="mt-1 text-xl sm:text-2xl font-bold tabular-nums"
                        data-testid="text-platform-fee"
                      >
                        -{formatCurrency(details.platformCommissionAmount)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Service commission
                      </div>
                    </div>

                    <div className="rounded-2xl border bg-card p-3 sm:p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-brand-success/10 text-brand-success">
                        <Wallet className="h-4 w-4" />
                      </span>
                      <div className="text-xs font-semibold text-muted-foreground">
                        Net Payout ({details.connectorPayoutPercentage}%)
                      </div>
                      <div
                        className="mt-1 text-xl sm:text-2xl font-bold tabular-nums"
                        data-testid="text-net-payout"
                      >
                        {formatCurrency(details.connectorPayoutAmount)}
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        {details.payoutReleased
                          ? getStatusBadge("completed")
                          : getStatusBadge("pending")}
                      </div>
                    </div>

                    <div className="rounded-2xl border bg-card p-3 sm:p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-brand-warning/10 text-brand-warning">
                        <Star className="h-4 w-4" />
                      </span>
                      <div className="text-xs font-semibold text-muted-foreground">
                        Payout Status
                      </div>
                      <div
                        className="mt-1 text-lg font-bold"
                        data-testid="text-payout-status"
                      >
                        {details.payoutReleased
                          ? "Completed"
                          : details.payoutTriggeredBy
                            ? "Processing"
                            : "Pending"}
                      </div>
                      {details.payoutTriggeredBy && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Via{" "}
                          {details.payoutTriggeredBy === "trust_score"
                            ? "Trust Score"
                            : "Peer Feedback"}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Trust Score Indicator for Connector */}
                {!isRequester && trustStatus && (
                  <div className="mt-4 rounded-xl border border-dashed bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "grid h-10 w-10 place-items-center rounded-full",
                          trustStatus.eligible
                            ? "bg-brand-success/10"
                            : "bg-brand-warning/10"
                        )}
                      >
                        <Star
                          className={cn(
                            "h-5 w-5",
                            trustStatus.eligible
                              ? "text-brand-success"
                              : "text-brand-warning"
                          )}
                        />
                      </div>
                      <div>
                        <p
                          className={cn("font-medium", trustStatus.color)}
                          data-testid="text-trust-score-status"
                        >
                          {trustStatus.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {trustStatus.eligible
                            ? "Your high trust score qualifies you for immediate payout upon meeting acknowledgment"
                            : "Payout will be released after the requester provides peer feedback"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {isRequester && details.refunds.length > 0 && (
                <BountyTransactionRefundInfo
                  refunds={details.refunds}
                  totalRefundedAmount={details.totalRefundedAmount}
                />
              )}

              {/* Voided Authorization Info */}
              {isRequester && details.remainingChargeStatus === "voided" && (
                <div className="rounded-2xl border bg-muted/50 p-4">
                  <div className="flex items-start gap-3">
                    <Ban className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <span className="font-semibold">
                        Authorization Released
                      </span>
                      <p className="mt-1 text-sm text-muted-foreground">
                        The remaining {details.remainingChargePercentage}%
                        authorization (
                        {formatCurrency(details.remainingChargeAmount)}) has
                        been released. No charge was made for this amount.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <BountyTransactionPaymentTimeline
                paymentEvents={details.paymentEvents}
                paymentCycles={details.paymentCycles ?? []}
                unsuccessfulAttempts={details.unsuccessfulAttempts ?? []}
                isRequester={isRequester}
              />

              {/* ===== Payment Receipts section ===== */}
              {(details.initialChargeReceiptUrl ||
                details.remainingChargeReceiptUrl) && (
                  <section className="rounded-2xl border border-brand-success/15 bg-brand-success/[0.05] p-5">
                    <h3 className="mb-4 flex items-center gap-2.5 text-base font-semibold">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-background text-brand-success">
                        <Receipt className="h-4 w-4" />
                      </span>
                      Payment Receipts
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {/* 5% Initial Payment Receipt */}
                      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-center md:gap-4">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-rose/10 text-brand-rose">
                            <Mail className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">5% Initial Payment</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {formatCurrency(details.initialChargeAmount)} charged
                              {initialInRefundState &&
                                details.initialRefundAmount != null
                                ? details.initialChargeStatus === "refunded"
                                  ? ` · ${formatCurrency(details.initialRefundAmount)} refunded`
                                  : details.initialChargeStatus ===
                                    "refund_initiated"
                                    ? ` · ${formatCurrency(details.initialRefundAmount)} refund pending`
                                    : " · Email sent"
                                : " · Email sent"}
                            </p>
                          </div>
                        </div>
                        {details.initialChargeReceiptUrl ? (
                          <a
                            href={details.initialChargeReceiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-amethyst/20 px-3 py-2 text-sm font-semibold text-brand-amethyst transition-colors hover:bg-brand-amethyst/10 md:w-auto md:justify-start md:border-transparent md:px-2 md:py-1"
                            data-testid="link-initial-receipt"
                          >
                            View Receipt
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="w-full text-xs text-muted-foreground md:w-auto">
                            Not yet captured
                          </span>
                        )}
                      </div>

                      {/* 95% Remaining Payment Receipt */}
                      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-center md:gap-4">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-success/10 text-brand-success">
                            <Calendar className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">95% Meeting Payment</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {formatCurrency(details.remainingChargeAmount)} -
                              Meeting booked
                            </p>
                          </div>
                        </div>
                        {details.remainingChargeReceiptUrl ? (
                          <a
                            href={details.remainingChargeReceiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-amethyst/20 px-3 py-2 text-sm font-semibold text-brand-amethyst transition-colors hover:bg-brand-amethyst/10 md:w-auto md:justify-start md:border-transparent md:px-2 md:py-1"
                            data-testid="link-remaining-receipt"
                          >
                            View Receipt
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="w-full text-xs text-muted-foreground md:w-auto">
                            Not yet captured
                          </span>
                        )}
                      </div>
                    </div>
                  </section>
                )}

              {/* Error Display - Only show to requester since payment errors are their responsibility */}
              {details.payoutError && isRequester && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                  <div className="flex items-start gap-2 text-destructive">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Payment Error</p>
                      <p className="text-sm">{details.payoutError}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
