// Response shape for GET /recruitment/payout/:candidateId/state.
// Drives both the Release Payout dialog and the Edit Classification dialog.
// Each row carries enough state for the UI to decide whether to render a
// classification form (status === 'pending') or a read-only status pill.

import { SafePayoutFailureReason } from "./recruitment-payout.constants";

export type RecruitmentPayoutRowStatus =
  | "pending"
  | "queued"
  | "processing"
  | "completed"
  | "cancelled"
  | "failed"
  | "manual_review"
  | "onboarding_pending";

export type RecruitmentPayoutCancellationReason =
  | "not_retained"
  | "inactive_employee"
  // Candidate-bonus cancel reasons
  | "candidate_failed_probation"
  | "candidate_left_voluntarily"
  | "position_unavailable"
  | "performance_issues"
  // Connector-payout cancel reasons
  | "invalid_duplicate_referral"
  | "connector_unresponsive"
  | "policy_violation"
  | "other"
  | null;

export interface PayoutRowState {
  id: string;
  status: RecruitmentPayoutRowStatus;
  // Client-safe failure reason (never the raw error_message). Non-null only for
  // failed / manual_review / onboarding_pending rows. Drives friendly UI copy.
  failureReason: SafePayoutFailureReason | null;
  recipientAmount: string;
  outboundPaymentId: string | null;
  cancellationReason: RecruitmentPayoutCancellationReason;
  cancellationNotes: string | null;
  canReleaseNow: boolean;
  // When this row's gating window ends, or null when there is no wait (paid on
  // hire) or it has already elapsed. For connector rows this is the per-type
  // connector waiting period; for the candidate row it is the probation end.
  waitEndsAt: string | null;
  // Extra amount HR will be charged at release to cover a Flat Referral Fee that
  // was RAISED after this candidate was hired, so the connector is paid the
  // latest fee. A 2-decimal dollar string; null for candidate-bonus rows, for
  // non-flat jobs, and when the fee was unchanged or lowered (no charge).
  // Display-only — the actual charge is recomputed server-side at release.
  connectorTopUp: string | null;
  // Extra amount HR will be charged at release to cover a Success Fee that was
  // RAISED (or enabled) after this candidate was charged, so the candidate is
  // paid the latest fee. A 2-decimal dollar string; null for connector rows, when
  // the fee is unchanged/lowered, and for frozen (non-pending) rows. Display-only.
  candidateTopUp: string | null;
  // When the Stripe transfer completed (null until paid). Used by the
  // read-only details view to show "Released <date>".
  completedAt: string | null;
  // Last action timestamp — used as the "Cancelled on <date>" for cancelled rows.
  updatedAt: string | null;
}

// Top-ups ALREADY collected for this candidate. A fee can be raised repeatedly
// before the payout is released, so `amount` is the SUM of every top-up taken
// and `paidAt` is the most recent. Present once the recruiter has completed a
// Pay step; `null` when nothing has been collected.
export interface PayoutTopUpFunded {
  amount: string;
  paidAt: string | null;
}

export interface PayoutStateConnector {
  connectorUserId: string;
  name: string;
  role: "primary" | "claimer" | "sharer";
  classificationType: "internal" | "external" | null;
  isActiveEmployee: boolean | null;
  avatar: string | null;
  jobTitle: string | null;
  company: string | null;
  linkedinUrl: string | null;
  payout: PayoutRowState | null;
}

export interface CandidatePayoutStateResponse {
  candidateId: string;
  candidateLabel: string;
  hireDate: string | null;
  // Candidate success-fee window.
  probationPeriodDays: number | null;
  probationEndsAt: string | null;
  // Connector payout (waiting-period) windows — per connector type. Per-row
  // unblock dates live on each row's `waitEndsAt`.
  intConnectorPayoutWaitDays: number | null;
  extConnectorPayoutWaitDays: number | null;
  intPayoutWaits: boolean;
  extPayoutWaits: boolean;
  connectors: PayoutStateConnector[];
  candidatePayout: PayoutRowState | null;
  // Already-collected top-ups, summed per fee type. This does NOT imply nothing
  // more is owed: if the fee was raised again since, the rows' `connectorTopUp` /
  // `candidateTopUp` carry the new shortfall and the dialog returns to the Pay
  // step for it.
  connectorTopUpFunded: PayoutTopUpFunded | null;
  candidateTopUpFunded: PayoutTopUpFunded | null;
}

// Response shape for POST /recruitment/payout/:candidateId/fund — the Pay step of
// the two-step release. `charged` is false on an idempotent replay (or when
// nothing was owed); `amount` / `paidAt` describe the collected top-up either way.
export interface FundPayoutTopUpResponse {
  candidateId: string;
  scope: "connector" | "candidate";
  charged: boolean;
  amount: string | null;
  paidAt: string | null;
}
