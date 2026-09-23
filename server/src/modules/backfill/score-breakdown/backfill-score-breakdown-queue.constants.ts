/** Bull queue name — keep stable for existing Redis deployments */
export const BACKFILL_SCORE_BREAKDOWN_QUEUE_NAME =
  "recruitment-score-breakdown-backfill";

export const BACKFILL_SCORE_BREAKDOWN_JOB_NAME = "run-score-breakdown-backfill";

/**
 * `attempts: 1` on purpose. A retry would re-run every job id, and with
 * `force: true` that means paying for a full second pass of Gemini calls.
 * Rows that fail individually are left without the key, so simply re-triggering
 * the endpoint picks them up.
 */
export const BACKFILL_SCORE_BREAKDOWN_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: {
      age: 24 * 60 * 60,
      count: 50,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
    },
  },
};
