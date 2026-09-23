import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/utils/dateFormatter";
import {
  DollarSign,
  Lock,
  CheckCircle2,
  Clock,
  XCircle,
  Shield,
  ExternalLink,
} from "lucide-react";
import type { CandidateTransactionSummary } from "@/lib/api/recruitment";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";

function getStatusBadge(status: string) {
  switch (status) {
    case "authorized":
      return {
        label: "Authorized",
        icon: Lock,
        className: "bg-blue-100 text-blue-700 border-blue-200",
      };
    case "captured":
      return {
        label: "Captured",
        icon: CheckCircle2,
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
      };
    case "pending":
      return {
        label: "Pending",
        icon: Clock,
        className: "bg-amber-100 text-amber-700 border-amber-200",
      };
    case "cancelled":
    case "failed":
    case "expired":
      return {
        label: status.charAt(0).toUpperCase() + status.slice(1),
        icon: XCircle,
        className: "bg-slate-100 text-slate-600 border-slate-200",
      };
    default:
      return {
        label: status,
        icon: Clock,
        className: "bg-slate-100 text-slate-600 border-slate-200",
      };
  }
}

interface PaymentAuthorizationCardProps {
  transaction: CandidateTransactionSummary;
}

export default function PaymentAuthorizationCard({
  transaction,
}: PaymentAuthorizationCardProps) {
  const statusBadge = getStatusBadge(transaction.status);
  const StatusIcon = statusBadge.icon;
  const costLabel = "Referral Fee";

  if (transaction.status === "captured") {
    const chargedAmount = transaction.chargeAmount
      ? Number(transaction.chargeAmount)
      : Number(transaction.totalAmount);

    // Server-computed: full flat fee, the deposit paid at shortlist, and any
    // post-hire fee top-up (when the fee was raised). Never calculated here.
    const fullReferralWithFees = Number(transaction.fullReferralAmount);
    const flatDepositPaid = Number(transaction.flatDepositApplied);
    const flatTopUpPaid = Number(transaction.flatTopUpApplied);
    // The three captured pieces sum to the full fee (deposit + hire + top-up).
    const flatTotalPaid = flatDepositPaid + chargedAmount + flatTopUpPaid;

    return (
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-green-50/30">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-sm">Payment Completed</h4>
            </div>
            <Badge
              variant="outline"
              className={`text-xs flex items-center gap-1 ${statusBadge.className}`}
            >
              <StatusIcon className="h-3 w-3" />
              {statusBadge.label}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{costLabel}</span>
              <span className="font-medium">
                ${formatMoneyWithCommas(Number(transaction.bountyAmount))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Stripe Processing Fee
              </span>
              <span className="font-medium">
                $
                {formatMoneyWithCommas(
                  Number(transaction.providerFee) +
                    Number(transaction.processingFee)
                )}
              </span>
            </div>
            {flatDepositPaid > 0 || flatTopUpPaid > 0 ? (
              <>
                <div className="border-t border-emerald-200 pt-2 flex justify-between">
                  <span className="text-muted-foreground">
                    Full Referral Fee
                  </span>
                  <span className="font-medium">
                    ${formatMoneyWithCommas(fullReferralWithFees)}
                  </span>
                </div>
                {flatDepositPaid > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Deposit paid at shortlist
                    </span>
                    <span className="font-medium">
                      ${formatMoneyWithCommas(flatDepositPaid)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Charged at hire</span>
                  <span className="font-medium">
                    ${formatMoneyWithCommas(chargedAmount)}
                  </span>
                </div>
                {flatTopUpPaid > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee top-up</span>
                    <span className="font-medium">
                      ${formatMoneyWithCommas(flatTopUpPaid)}
                    </span>
                  </div>
                )}
                <div className="border-t border-emerald-200 pt-2 flex justify-between">
                  <span className="font-semibold">Total paid</span>
                  <span className="font-bold text-emerald-600">
                    ${formatMoneyWithCommas(flatTotalPaid)}
                  </span>
                </div>
              </>
            ) : (
              <div className="border-t border-emerald-200 pt-2 flex justify-between">
                <span className="font-semibold">Total Charged</span>
                <span className="font-bold text-emerald-600">
                  ${formatMoneyWithCommas(chargedAmount)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            {transaction.capturedAt && (
              <p>Captured on {formatDateTime(transaction.capturedAt)}</p>
            )}
            {transaction.receiptUrl && (
              <a
                href={transaction.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                View Receipt
              </a>
            )}
            <p className="flex items-center gap-1 text-emerald-600">
              <Shield className="h-3 w-3" />
              Payment processed securely via Stripe
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50/50 to-purple-50/30">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-violet-600" />
            </div>
            <h4 className="font-semibold text-sm">Payment Authorization</h4>
          </div>
          <Badge
            variant="outline"
            className={`text-xs flex items-center gap-1 ${statusBadge.className}`}
          >
            <StatusIcon className="h-3 w-3" />
            {statusBadge.label}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{costLabel}</span>
            <span className="font-medium">
              ${formatMoneyWithCommas(Number(transaction.bountyAmount))}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Stripe Processing Fee</span>
            <span className="font-medium">
              $
              {formatMoneyWithCommas(
                Number(transaction.providerFee) +
                  Number(transaction.processingFee)
              )}
            </span>
          </div>
          <div className="border-t border-violet-200 pt-2 flex justify-between">
            <span className="font-semibold">Total Authorized</span>
            <span className="font-bold text-emerald-600">
              ${formatMoneyWithCommas(Number(transaction.totalAmount))}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          {transaction.authorizedAt && (
            <p>Authorized on {formatDateTime(transaction.authorizedAt)}</p>
          )}
          <p className="flex items-center gap-1 text-violet-600">
            <Shield className="h-3 w-3" />
            Funds held securely via Stripe. Released only when interview is
            scheduled.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
