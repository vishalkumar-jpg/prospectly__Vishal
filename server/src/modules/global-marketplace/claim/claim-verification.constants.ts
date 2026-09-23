export const CLAIM_VERIFICATION_QUEUE_NAME = "claim-verification";

export const CLAIM_VERIFICATION_JOB_TYPES = {
  VERIFY_CONTACT_MATCH: "verify-contact-match",
} as const;

/**
 * Verification status values used for client compatibility.
 * These map to marketplace_claims.status as follows:
 * - PENDING -> "pending"
 * - IN_PROGRESS -> "in_progress" (or "verifying")
 * - CLAIMED_COMPLETED -> "completed"
 * - NOT_CLAIMED_FAILED -> "failed"
 */
export const CLAIM_VERIFICATION_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  CLAIMED_COMPLETED: "claimed_completed",
  NOT_CLAIMED_FAILED: "not_claimed_failed",
} as const;

export type ClaimVerificationStatus =
  (typeof CLAIM_VERIFICATION_STATUS)[keyof typeof CLAIM_VERIFICATION_STATUS];

export const IMPORT_SOURCES = [
  "linkedin",
  "google",
  "microsoft",
  "apple",
  "csv",
] as const;

export type ImportSource = (typeof IMPORT_SOURCES)[number];

export const CLAIM_VERIFICATION_MESSAGES = {
  INFO: {
    VERIFICATION_STARTED: "Verification process started",
    VERIFICATION_IN_PROGRESS: "Verification in progress",
    VERIFICATION_COMPLETED: "Connection verified successfully",
    VERIFICATION_FAILED: "Prospect not found in your contacts",
    STATUS_RETRIEVED: "Verification status retrieved",
    REFRESH_TRIGGERED: "Verification refresh triggered",
  },
  ERROR: {
    NO_PENDING_VERIFICATION: "No pending verification found",
    VERIFICATION_NOT_FOUND: "Verification not found",
    ALREADY_CLAIMED: "This request has already been claimed",
    REQUEST_NOT_AVAILABLE: "Request not available for claiming",
    INVALID_SHARE_CODE: "Invalid share code for this request",
  },
};

export const CLAIM_VERIFICATION_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
};
