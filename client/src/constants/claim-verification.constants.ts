export const VERIFICATION_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  CLAIMED_COMPLETED: "claimed_completed",
  NOT_CLAIMED_FAILED: "not_claimed_failed",
} as const;

export type VerificationStatus =
  (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];
