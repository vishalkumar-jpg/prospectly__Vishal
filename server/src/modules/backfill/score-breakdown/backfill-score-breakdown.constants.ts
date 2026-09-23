/**
 * Backfill-only settings. The scoring model itself — which dimensions are
 * scored, their weights, the version and the payload assembly — is shared with
 * the inline evaluation path and lives in
 * `modules/recruitment/candidate-evaluation/gap-analysis-score-breakdown.constants`.
 */

/** Key added inside the existing `gap_analysis` jsonb blob. */
export const SCORE_BREAKDOWN_KEY = "scoreBreakdown";

/** Upper bound on job ids per request — one Gemini call per candidate. */
export const SCORE_BREAKDOWN_MAX_JOB_IDS = 20;

/** Pacing between Gemini calls; there is no rate limiter in the codebase. */
export const SCORE_BREAKDOWN_AI_DELAY_MS = 200;

/** Initial call plus one retry when the AI's points do not sum to the score. */
export const SCORE_BREAKDOWN_AI_ATTEMPTS = 2;

/** Retries handed to the shared Gemini client for transient failures. */
export const SCORE_BREAKDOWN_GEMINI_RETRIES = 3;

/** Prompt trimming — the shared Gemini client truncates prompts at 15k chars. */
export const SCORE_BREAKDOWN_MAX_CHIPS_PER_LIST = 12;
export const SCORE_BREAKDOWN_MAX_CHIP_LABEL_LENGTH = 80;
export const SCORE_BREAKDOWN_MAX_SUBTITLE_LENGTH = 160;

export const SCORE_BREAKDOWN_AI_ACTION_TYPE = "score-breakdown-backfill";
