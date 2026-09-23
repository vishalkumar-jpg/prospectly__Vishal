export const CREDIT_IMPORT_ALLOCATION_QUEUE_NAME = "credit-import-allocation";

export const CREDIT_IMPORT_ALLOCATION_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential" as const,
      delay: 10_000,
    },
    removeOnComplete: {
      age: 24 * 60 * 60,
      count: 200,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
    },
  },
};
