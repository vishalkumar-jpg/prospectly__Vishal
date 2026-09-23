export const RECRUITMENT_PAYOUT_QUEUE_NAME = "recruitment-payout-queue";

export const RECRUITMENT_PAYOUT_JOB_TYPES = {
  PROCESS_PAYOUT: "process-recruitment-payout",
} as const;

export const INTERVIEW_OUTCOMES = {
  COMPLETED: "completed",
  NO_SHOW: "no_show",
  CANCELLED: "cancelled",
} as const;

export const RECRUITMENT_PAYOUT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  FAILED: "failed",
} as const;

export const RECRUITMENT_PROCESSING_STATUS = {
  PENDING: "pending",
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  MANUAL_REVIEW: "manual_review",
  ONBOARDING_PENDING: "onboarding_pending",
} as const;

// Client-safe failure reasons. NEVER expose the raw `error_message` column to
// HR or connectors — it can contain Stripe internals / raw exception text.
// Every failure-surfacing endpoint maps to one of these via
// `toSafeFailureReason` so copy stays consistent and no surface leaks details.
export const SAFE_PAYOUT_FAILURE_REASON = {
  // A recoverable transfer failure the recruiter can retry.
  TRANSFER_FAILED: "transfer_failed",
  // The recipient hasn't finished payout/bank onboarding.
  RECIPIENT_SETUP_INCOMPLETE: "recipient_setup_incomplete",
  // Non-recoverable — needs manual/ops review.
  NEEDS_REVIEW: "needs_review",
} as const;

export type SafePayoutFailureReason =
  (typeof SAFE_PAYOUT_FAILURE_REASON)[keyof typeof SAFE_PAYOUT_FAILURE_REASON];

/**
 * Map an internal payout processing state to a client-safe failure reason.
 * Server-only inputs (`processingStatus`, raw `errorMessage`) never leave the
 * server; only the returned enum is safe to send to HR/connectors.
 *
 * Returns null when the row is not in a failed/deferred state.
 */
export const toSafeFailureReason = (
  processingStatus: string | null
): SafePayoutFailureReason | null => {
  switch (processingStatus) {
    case RECRUITMENT_PROCESSING_STATUS.FAILED:
      return SAFE_PAYOUT_FAILURE_REASON.TRANSFER_FAILED;
    case RECRUITMENT_PROCESSING_STATUS.MANUAL_REVIEW:
      return SAFE_PAYOUT_FAILURE_REASON.NEEDS_REVIEW;
    case RECRUITMENT_PROCESSING_STATUS.ONBOARDING_PENDING:
      return SAFE_PAYOUT_FAILURE_REASON.RECIPIENT_SETUP_INCOMPLETE;
    default:
      return null;
  }
};

// Share of the connector pool a single connector receives (100% — split
// referrals are disabled). Used by BOTH the release write path and the payout
// state preview so the amount shown before releasing is the amount released.
export const SINGLE_CONNECTOR_SHARE_PERCENT = 100;

export const RECRUITMENT_PAYOUT_TYPE = {
  CONNECTOR: "connector",
  CANDIDATE: "candidate",
} as const;

export const RECRUITMENT_PAYOUT_CANCELLATION_REASON = {
  // Legacy bucket — kept for historical rows. Not surfaced in the new dropdown.
  NOT_RETAINED: "not_retained",
  // System-only — set when retained=true and a connector is internal + !active.
  INACTIVE_EMPLOYEE: "inactive_employee",
  // Recruiter-selectable when cancelling the CANDIDATE bonus.
  CANDIDATE_FAILED_PROBATION: "candidate_failed_probation",
  CANDIDATE_LEFT_VOLUNTARILY: "candidate_left_voluntarily",
  POSITION_UNAVAILABLE: "position_unavailable",
  PERFORMANCE_ISSUES: "performance_issues",
  // Recruiter-selectable when cancelling a CONNECTOR payout.
  INVALID_DUPLICATE_REFERRAL: "invalid_duplicate_referral",
  CONNECTOR_UNRESPONSIVE: "connector_unresponsive",
  POLICY_VIOLATION: "policy_violation",
  // Shared catch-all (used by both candidate and connector cancel flows).
  OTHER: "other",
} as const;

// Subset the recruiter may pick when cancelling the CANDIDATE bonus via the
// Release Candidate Bonus dialog. The two system values above are excluded —
// `not_retained` is legacy and `inactive_employee` is set automatically.
export const RECRUITER_SELECTABLE_CANCELLATION_REASONS = [
  RECRUITMENT_PAYOUT_CANCELLATION_REASON.CANDIDATE_FAILED_PROBATION,
  RECRUITMENT_PAYOUT_CANCELLATION_REASON.CANDIDATE_LEFT_VOLUNTARILY,
  RECRUITMENT_PAYOUT_CANCELLATION_REASON.POSITION_UNAVAILABLE,
  RECRUITMENT_PAYOUT_CANCELLATION_REASON.PERFORMANCE_ISSUES,
  RECRUITMENT_PAYOUT_CANCELLATION_REASON.OTHER,
] as const;

// Subset the recruiter may pick when cancelling a CONNECTOR payout via the
// Release Connector Payout dialog.
export const RECRUITER_SELECTABLE_CONNECTOR_CANCELLATION_REASONS = [
  RECRUITMENT_PAYOUT_CANCELLATION_REASON.INVALID_DUPLICATE_REFERRAL,
  RECRUITMENT_PAYOUT_CANCELLATION_REASON.CONNECTOR_UNRESPONSIVE,
  RECRUITMENT_PAYOUT_CANCELLATION_REASON.POLICY_VIOLATION,
  RECRUITMENT_PAYOUT_CANCELLATION_REASON.OTHER,
] as const;

export const RECRUITMENT_CONNECTOR_CLASSIFICATION = {
  INTERNAL: "internal",
  EXTERNAL: "external",
} as const;

// Discriminator on recruitment_interview_transactions. Add new fee types here
// (e.g. RUSH_FEE) — schema needs no change because each fee gets its own row.
export const RECRUITMENT_INTERVIEW_TXN_TYPE = {
  INTERVIEW_COST: "interview_cost",
  SUCCESS_FEE: "success_fee",
  // One-time deposit (the "charged at publish" 5% slice) captured at the FIRST
  // shortlist of a flat_referral job. Collected once per job and credited
  // job-wide — no payout is generated from this row. The connector payout is
  // funded by the interview_cost charge created at interview scheduling.
  FLAT_DEPOSIT: "flat_deposit",
  // Top-up collected by the PAY step when the Flat Referral Fee was RAISED after
  // the candidate was hired (so the connector is paid the latest fee).
  // Amount = total(latest fee) − (total(fee at hire) + top-ups already taken).
  // SEVERAL rows per candidate are expected: the fee can be raised repeatedly
  // before the payout is released and each raise collects only its own delta.
  FLAT_TOPUP: "flat_topup",
  // Top-up collected by the PAY step when the Success Fee was RAISED (or
  // enabled) after this candidate was charged, so the candidate is paid the
  // latest fee. Amount = latest success fee − success fee already funded.
  // SEVERAL rows per candidate are expected, for the same reason as above.
  SUCCESS_FEE_TOPUP: "success_fee_topup",
} as const;

// Lifecycle values for recruitment_interview_transactions.status (shared
// across all transactionType values).
export const RECRUITMENT_INTERVIEW_TXN_STATUS = {
  PENDING: "pending",
  AUTHORIZED: "authorized",
  CAPTURED: "captured",
  CANCELLED: "cancelled",
  FAILED: "failed",
} as const;

export const RECRUITMENT_PAYOUT_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 60000,
    },
    removeOnComplete: {
      age: 7 * 24 * 60 * 60,
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
    },
  },
};
