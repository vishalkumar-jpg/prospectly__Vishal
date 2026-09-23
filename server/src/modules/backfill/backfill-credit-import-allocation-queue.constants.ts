/** Bull queue name — keep stable for existing Redis deployments */
export const BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_NAME =
  "credit-import-allocation-backfill";

export const BACKFILL_CREDIT_IMPORT_ALLOCATION_JOB_NAME =
  "run-import-allocations-backfill";

/**
 * Isolated from per-import `credit-import-allocation` so long backfills do not
 * block post-import credit jobs. Few retries: a failed run can be re-triggered manually.
 */
export const BACKFILL_CREDIT_IMPORT_ALLOCATION_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential" as const,
      delay: 60_000,
    },
    removeOnComplete: {
      age: 24 * 60 * 60,
      count: 50,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
    },
  },
};
