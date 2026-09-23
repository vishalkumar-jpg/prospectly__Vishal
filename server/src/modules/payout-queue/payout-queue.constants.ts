export const PAYOUT_QUEUE_NAME = "payout-queue";

export const PAYOUT_JOB_TYPES = {
  TRUST_SCORE_PAYOUT: "trust-score-payout",
  FEEDBACK_PAYOUT: "feedback-payout",
} as const;

export const PROCESSING_STATUS = {
  PENDING: "pending",
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  ONBOARDING_PENDING: "onboarding_pending", // Waiting for Stripe Connect account onboarding
} as const;

export const PAYOUT_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 60000,
    },
    removeOnComplete: {
      age: 7 * 24 * 60 * 60, // 7 days - matches removeOnFail for consistency and better debugging/audit trail
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // 7 days
    },
  },
};
