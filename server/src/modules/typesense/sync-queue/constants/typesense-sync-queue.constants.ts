export const TYPESENSE_SYNC_QUEUE_NAME = "typesense-sync";

export const TYPESENSE_SYNC_QUEUE_JOBS = {
  CONTACT_SYNC: "contact-sync",
  APOLLO_CACHE_SYNC: "apollo-cache-sync",
} as const;

export const TYPESENSE_SYNC_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 60000 },
    removeOnComplete: { age: 24 * 60 * 60, count: 100 },
    removeOnFail: { age: 7 * 24 * 60 * 60 },
  },
};
