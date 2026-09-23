import { Info, RotateCcw } from "lucide-react";
import type { RefundInfo } from "@/hooks/useTransactionHistory";
import { formatRefundReason } from "@/utils/refund-reason-labels";
import {
  formatCurrency,
  getStatusBadge,
} from "./bounty-transaction-display.utils";

interface BountyTransactionRefundInfoProps {
  refunds: RefundInfo[];
  totalRefundedAmount: number;
}

export function BountyTransactionRefundInfo({
  refunds,
  totalRefundedAmount,
}: BountyTransactionRefundInfoProps) {
  if (refunds.length === 0) return null;

  return (
    <div className="rounded-2xl border border-brand-sky/15 bg-brand-sky/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <RotateCcw className="h-5 w-5 text-brand-sky" />
        <span className="font-semibold">Refund Information</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Refunded</span>
          <span className="text-lg font-bold tabular-nums">
            {formatCurrency(totalRefundedAmount)}
          </span>
        </div>
        {refunds.map((refund, index) => (
          <div
            key={index}
            className="flex items-center justify-between border-t border-brand-sky/20 pt-2 text-sm"
          >
            <div className="flex flex-col">
              <span>
                {refund.stageName === "intro_email_sent"
                  ? "Initial Payment (5%)"
                  : "Remaining Payment (95%)"}
              </span>
              {refund.refundReason && (
                <span className="text-xs text-muted-foreground">
                  Reason: {formatRefundReason(refund.refundReason)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(refund.refundStatus)}
              <span className="font-medium tabular-nums">
                {formatCurrency(refund.refundAmount)}
              </span>
            </div>
          </div>
        ))}
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-brand-sky/10 p-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-sky" />
          <p className="text-xs text-muted-foreground">
            Refunds return the referral payout portion only. Stripe processing
            and application fees on the captured milestone are not refunded.
            Refunds typically take 5-10 business days to appear in your bank
            account, depending on your financial institution.
          </p>
        </div>
      </div>
    </div>
  );
}
