export const MARKETPLACE_PAYOUT_QUEUE_NAME = "marketplace-payout";

export const MARKETPLACE_PAYOUT_JOB_TYPES = {
  PROCESS_MARKETPLACE_PAYOUT: "process-marketplace-payout",
} as const;

/**
 * Marketplace Payout Split:
 * - Platform: 20%
 * - Claimer: 40% (50% of remaining 80%)
 * - Sharer: 40% (50% of remaining 80%)
 */
export const MARKETPLACE_PAYOUT_SPLIT = {
  PLATFORM_PERCENT: 20,
  CLAIMER_PERCENT: 40,
  SHARER_PERCENT: 40,
} as const;

export const MARKETPLACE_PAYOUT_ROLE = {
  CLAIMER: "claimer",
  SHARER: "sharer",
} as const;

export type MarketplacePayoutRole =
  (typeof MARKETPLACE_PAYOUT_ROLE)[keyof typeof MARKETPLACE_PAYOUT_ROLE];

export const MARKETPLACE_PAYOUT_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const MARKETPLACE_PAYOUT_MESSAGES = {
  INFO: {
    PAYOUT_QUEUED: "Marketplace payout queued successfully",
    PAYOUT_COMPLETED: "Marketplace payout completed successfully",
    CLAIMER_TRANSFER_CREATED: "Claimer transfer created",
    SHARER_TRANSFER_CREATED: "Sharer transfer created",
  },
  ERROR: {
    REQUEST_NOT_FOUND: "Introduction request not found",
    NOT_MARKETPLACE_DEAL: "This is not a marketplace deal",
    PAYOUT_ALREADY_PROCESSED: "Payout already processed",
    CLAIMER_NO_STRIPE: "Claimer does not have a Stripe account",
    SHARER_NO_STRIPE: "Sharer does not have a Stripe account",
    PAYMENT_NOT_CAPTURED: "Payment not fully captured",
  },
};

export const MARKETPLACE_PAYOUT_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 10000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
};
