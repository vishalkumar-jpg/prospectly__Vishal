import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RequesterFeeBreakdownProps {
  referralPayout: number | null;
  providerFee: number | null;
  processingFee: number | null;
  totalAmount: number | null;
  initialChargeAmount?: number | null;
  remainingChargeAmount?: number | null;
  recalculating?: boolean;
  className?: string;
  showMilestones?: boolean;
}

type FeeRowVariant = "primary" | "secondary" | "total";

interface FeeRowProps {
  label: string;
  amount: string;
  variant: FeeRowVariant;
  recalculating?: boolean;
}

function FeeRow({ label, amount, variant, recalculating }: FeeRowProps) {
  const labelClass =
    variant === "primary"
      ? "text-sm font-medium text-foreground"
      : variant === "total"
        ? "text-sm font-semibold text-foreground"
        : "text-xs text-muted-foreground";

  const amountClass =
    variant === "primary"
      ? "text-sm font-semibold text-foreground tabular-nums"
      : variant === "total"
        ? "text-base font-bold text-foreground tabular-nums inline-flex items-center gap-1.5"
        : "text-sm text-muted-foreground tabular-nums inline-flex items-center gap-1.5";

  return (
    <div className="flex justify-between items-baseline gap-3">
      <span className={labelClass}>{label}</span>
      <span className={amountClass}>
        {recalculating && variant !== "primary" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
        ) : null}
        {amount}
      </span>
    </div>
  );
}

export function RequesterFeeBreakdown({
  referralPayout,
  providerFee,
  processingFee,
  totalAmount,
  initialChargeAmount,
  remainingChargeAmount,
  recalculating = false,
  className,
  showMilestones = true,
}: RequesterFeeBreakdownProps) {
  const AMOUNT_PLACEHOLDER = "—";

  const formatMoney = (value: number | null): string =>
    value !== null
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value)
      : AMOUNT_PLACEHOLDER;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="rounded-lg border border-border/60 bg-muted/30 dark:bg-muted/20 shadow-sm px-4 py-3.5 space-y-2.5">
        <FeeRow
          label="Referral payout"
          amount={formatMoney(referralPayout)}
          variant="primary"
        />
        <FeeRow
          label="Stripe Processing Fee (2.9% + $0.30)"
          amount={formatMoney(providerFee)}
          variant="secondary"
          recalculating={recalculating}
        />
        <FeeRow
          label="Application Fee"
          amount={formatMoney(processingFee)}
          variant="secondary"
        />
        <div className="border-t border-border/80 pt-3 mt-1">
          <FeeRow
            label="Total"
            amount={formatMoney(totalAmount)}
            variant="total"
            recalculating={recalculating}
          />
        </div>
      </div>

      {showMilestones &&
        initialChargeAmount != null &&
        remainingChargeAmount != null && (
          <div className="mt-4 pt-3 border-t border-border/50 space-y-2 text-sm">
            <div className="rounded-lg bg-muted/20 dark:bg-muted/10 border border-border/40 px-3 py-2.5 space-y-2">
              <div className="flex justify-between items-baseline gap-3">
                <span className="text-xs text-muted-foreground">
                  Email delivery (5%)
                </span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  ${initialChargeAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-baseline gap-3">
                <span className="text-xs text-muted-foreground">
                  Meeting booked (95%)
                </span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  ${remainingChargeAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
