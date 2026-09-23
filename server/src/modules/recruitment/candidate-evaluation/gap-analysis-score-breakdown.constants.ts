import {
  GAP_DIMENSION_KEYS,
  type GapDimensionKey,
} from "./candidate-evaluation-gap-analysis.schema";

/**
 * The dimensions that contribute points to the overall score.
 *
 * Work eligibility and employment type are deliberately excluded: they are
 * pass/fail context a recruiter needs to see, not levers that should move a
 * candidate's score. They are still generated and displayed, just unscored.
 */
export const SCORED_DIMENSION_KEYS = [
  "skillsMatch",
  "experienceMatch",
  "domainKnowledge",
  "educationMatch",
] as const;

export type ScoredDimensionKey = (typeof SCORED_DIMENSION_KEYS)[number];

export const SCORE_BREAKDOWN_WEIGHTS: Record<ScoredDimensionKey, number> = {
  skillsMatch: 40,
  experienceMatch: 30,
  domainKnowledge: 20,
  educationMatch: 10,
};

export const SCORE_BREAKDOWN_TOTAL_WEIGHT = 100;

/** v1 was the six-dimension backfill-only model. */
export const SCORE_BREAKDOWN_VERSION = "v2";

export const SCORE_BREAKDOWN_SOURCE_EVALUATION = "evaluation";
export const SCORE_BREAKDOWN_SOURCE_BACKFILL = "backfill";

/** Score at or above which the verdict badge reads ok / partial. */
export const VERDICT_STATUS_OK_MIN = 80;
export const VERDICT_STATUS_PARTIAL_MIN = 50;

/**
 * Share of a dimension's weight awarded when the model omits its points and
 * the value has to be inferred from the badge it did supply.
 */
export const BADGE_PARTIAL_POINTS_RATIO = 0.6;

export const SCORE_BREAKDOWN_MAX_TOP_REASONS = 3;
export const SCORE_BREAKDOWN_MAX_REASON_LENGTH = 240;

/**
 * Raised above the shared client's 15k default: a long job description could
 * otherwise push the resume off the end of the prompt and produce a
 * confidently wrong score with no warning.
 */
export const CANDIDATE_EVALUATION_MAX_PROMPT_CHARS = 40_000;

// Fail fast at import time rather than silently mis-scoring every candidate.
const configuredWeightTotal = Object.values(SCORE_BREAKDOWN_WEIGHTS).reduce(
  (total, weight) => total + weight,
  0
);
if (configuredWeightTotal !== SCORE_BREAKDOWN_TOTAL_WEIGHT) {
  throw new Error(
    `SCORE_BREAKDOWN_WEIGHTS must total ${String(SCORE_BREAKDOWN_TOTAL_WEIGHT)}, got ${String(configuredWeightTotal)}`
  );
}

const displayKeys = new Set<string>(GAP_DIMENSION_KEYS);
for (const key of SCORED_DIMENSION_KEYS) {
  if (!displayKeys.has(key)) {
    throw new Error(
      `SCORED_DIMENSION_KEYS contains "${key}", which is not a gap analysis dimension`
    );
  }
}

export function isScoredDimensionKey(
  key: GapDimensionKey
): key is ScoredDimensionKey {
  return (SCORED_DIMENSION_KEYS as readonly string[]).includes(key);
}
