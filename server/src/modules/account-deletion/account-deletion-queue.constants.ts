export const ACCOUNT_DELETION_QUEUE_NAME = "account-deletion-queue";

export const ACCOUNT_DELETION_JOB_NAME = "account-purge";

export const ACCOUNT_DELETION_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 1,
    backoff: {
      type: "exponential" as const,
      delay: 60_000,
    },
    removeOnComplete: {
      age: 7 * 24 * 60 * 60,
      count: 50,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
    },
  },
};

export const ACCOUNT_DELETION_MAX_DELAY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
