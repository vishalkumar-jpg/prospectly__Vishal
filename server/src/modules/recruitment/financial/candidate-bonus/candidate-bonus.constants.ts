/**
 * Constants, enums, and messages for the Candidate Bonus module.
 *
 * Scoped to `recruitment_payout_history` rows with payoutType = 'candidate' —
 * the success-fee bonus paid to a hired candidate. Mirrors the shape of
 * `connector-earning.constants.ts` (same status/sort enums) so the two
 * self-scoped recruitment finance tabs stay symmetric.
 */

export enum CandidateBonusStatusEnum {
  ALL = "all",
  PENDING = "pending",
  ONBOARDING_PENDING = "onboarding_pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  // Lives on `recruitment_payout_history.status`, not `processingStatus` —
  // filtered separately in the service.
  CANCELLED = "cancelled",
}

export enum CandidateBonusSortFieldEnum {
  DATE = "date",
  AMOUNT = "amount",
  STATUS = "status",
}

export enum CandidateBonusSortOrderEnum {
  ASC = "asc",
  DESC = "desc",
}

/**
 * Candidate-facing labels for `recruitment_payout_history.cancellationReason`.
 * The detail endpoint returns only the mapped label (`cancellationReasonLabel`)
 * — never the raw reason code. Unknown/legacy codes fall back to a generic
 * label in the service.
 */
export const CANDIDATE_BONUS_CANCELLATION_LABELS: Record<string, string> = {
  not_retained: "Not retained",
  inactive_employee: "No longer an active employee",
  candidate_failed_probation: "Probation not completed",
  candidate_left_voluntarily: "Left the role voluntarily",
  position_unavailable: "Position no longer available",
  performance_issues: "Performance issues",
  other: "Other",
};

export const CANDIDATE_BONUS_FALLBACK_CANCELLATION_LABEL = "Cancelled";

export const CANDIDATE_BONUS_MESSAGES = {
  INFO: {
    FETCHING_LIST: (userId: string) =>
      `Fetching candidate bonus list for user ${userId}`,
    FETCHING_DETAIL: (id: string, userId: string) =>
      `Fetching candidate bonus detail ${id} for user ${userId}`,
  },
  ERROR: {
    BONUS_NOT_FOUND: "Bonus not found",
  },
};
