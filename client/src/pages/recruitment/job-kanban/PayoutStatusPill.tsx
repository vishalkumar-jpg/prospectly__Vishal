import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import type { PayoutRowState } from "@/lib/api/recruitment";
import { getCancellationReasonLabel } from "@/lib/recruitment/cancellation-reasons";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";

// Single source of truth for the status-pill glossary used by ReleasePayout
// and EditClassification dialogs. Keep colour usage aligned with the project's
// semantic colour map (.claude/rules/ux-design-system.md):
//   - Green = success / completed
//   - Blue  = in-progress
//   - Slate = neutral / awaiting external action
//   - Amber = warning / refunded-style states (none here)
//   - Red   = error / cancelled / failed

interface Props {
  payout: PayoutRowState;
  /** Optional dollar suffix when status is `completed`. */
  showAmount?: boolean;
}

export function PayoutStatusPill({ payout, showAmount = true }: Props) {
  const amountSuffix =
    showAmount && payout.recipientAmount
      ? ` $${formatMoneyWithCommas(Number(payout.recipientAmount))}`
      : "";

  switch (payout.status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Paid{amountSuffix}
        </span>
      );

    case "queued":
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
          <Clock className="h-3.5 w-3.5" />
          Transfer in progress
        </span>
      );

    case "cancelled": {
      if (payout.cancellationReason === "inactive_employee") {
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
            <XCircle className="h-3.5 w-3.5" />
            Skipped — inactive employee
          </span>
        );
      }
      const reasonLabel = getCancellationReasonLabel(payout.cancellationReason);
      const tooltip = payout.cancellationNotes ?? undefined;
      return (
        <span
          className="inline-flex items-center gap-1 text-xs font-medium text-red-700"
          title={tooltip}
        >
          <XCircle className="h-3.5 w-3.5" />
          {reasonLabel ? `Cancelled — ${reasonLabel}` : "Cancelled"}
        </span>
      );
    }

    case "onboarding_pending":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
          <RotateCcw className="h-3.5 w-3.5" />
          Awaiting Stripe Connect setup
        </span>
      );

    case "failed":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          Transfer failed
        </span>
      );

    case "manual_review":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          Needs manual review
        </span>
      );

    case "pending":
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
          <Clock className="h-3.5 w-3.5" />
          Pending
        </span>
      );
  }
}
