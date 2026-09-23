export const STRIPE_QUEUE_NAME = "stripe-queue";

export const STRIPE_JOB_TYPES = {
  CREATE_CUSTOMER: "create-customer",
} as const;

export const STRIPE_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 1000, // 1 second initial delay
    },
    removeOnComplete: {
      age: 24 * 60 * 60, // Keep completed jobs for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
    },
  },
};
