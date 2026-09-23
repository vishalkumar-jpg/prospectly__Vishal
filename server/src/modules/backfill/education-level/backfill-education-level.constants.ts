/** Bull queue name — keep stable for existing Redis deployments. */
export const BACKFILL_EDUCATION_LEVEL_QUEUE_NAME =
  "recruitment-education-level-backfill";

export const BACKFILL_EDUCATION_LEVEL_JOB_NAME = "run-education-level-backfill";

/** Rows per pass. Derived from data already in the row, so no external limit applies. */
export const BACKFILL_EDUCATION_LEVEL_PAGE_SIZE = 500;

/**
 * `attempts: 2` is safe here, unlike the AI backfills: this reads a column and
 * writes a column, so a retry costs a query rather than a second round of
 * paid calls. It is also idempotent — a re-run only touches rows still unset.
 */
export const BACKFILL_EDUCATION_LEVEL_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: { age: 24 * 60 * 60, count: 50 },
    removeOnFail: { age: 7 * 24 * 60 * 60 },
  },
};
