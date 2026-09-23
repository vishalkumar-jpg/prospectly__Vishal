// Shared label/value map for payout cancellation reasons.
// Used by:
//   - ReleasePayoutDialog (recruiter dropdown)
//   - PayoutStatusPill (recruiter-side status badge tooltip)
//   - ConnectorKanbanCard (connector-side cancellation alert)
// Values mirror RECRUITMENT_PAYOUT_CANCELLATION_REASON on the server.

import type {
  RecruiterCancellationReason,
  ConnectorCancellationReason,
  PayoutCancellationReason,
} from "@/lib/api/recruitment";

export interface CancellationReasonOption {
  value: RecruiterCancellationReason;
  label: string;
}

export interface ConnectorCancellationReasonOption {
  value: ConnectorCancellationReason;
  label: string;
}

// Candidate-bonus cancel reasons (Release Candidate Bonus dialog).
export const CANCELLATION_REASON_OPTIONS: CancellationReasonOption[] = [
  {
    value: "candidate_failed_probation",
    label: "Candidate did not pass probation",
  },
  {
    value: "candidate_left_voluntarily",
    label: "Candidate left voluntarily",
  },
  {
    value: "position_unavailable",
    label: "Position no longer available",
  },
  {
    value: "performance_issues",
    label: "Performance issues",
  },
  {
    value: "other",
    label: "Other",
  },
];

// Connector-payout cancel reasons (Release Connector Payout dialog).
export const CONNECTOR_CANCELLATION_REASON_OPTIONS: ConnectorCancellationReasonOption[] =
  [
    {
      value: "invalid_duplicate_referral",
      label: "Invalid or duplicate referral",
    },
    {
      value: "connector_unresponsive",
      label: "Connector unresponsive",
    },
    {
      value: "policy_violation",
      label: "Policy violation",
    },
    {
      value: "other",
      label: "Other",
    },
  ];

const LABEL_BY_VALUE: Record<string, string> = Object.fromEntries([
  ...CANCELLATION_REASON_OPTIONS.map((o) => [o.value, o.label]),
  ...CONNECTOR_CANCELLATION_REASON_OPTIONS.map((o) => [o.value, o.label]),
]);

// Friendly labels for the two legacy/system reasons too, so the connector
// card and status pill have a single lookup table.
LABEL_BY_VALUE["not_retained"] = "Not retained";
LABEL_BY_VALUE["inactive_employee"] = "Inactive employee";

export function getCancellationReasonLabel(
  reason: PayoutCancellationReason | string | null
): string | null {
  if (!reason) return null;
  return LABEL_BY_VALUE[reason] ?? null;
}
