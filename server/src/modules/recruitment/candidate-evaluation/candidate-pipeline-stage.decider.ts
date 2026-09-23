import { CANDIDATE_EVALUATION_CONFIG } from "./candidate-evaluation.constants";

export interface PipelineStageInput {
  /** AI match percentage (0–100). */
  matchScore: number;
  /**
   * Whether the candidate passed every assessment answer.
   *  - `true`  → all answers correct
   *  - `false` → at least one answer incorrect
   *  - `null`  → the job has no assessment
   */
  assessmentPassed: boolean | null;
}

/**
 * Single source of truth for where an applicant lands after evaluation.
 *
 * Rules (apply to every job):
 *  - any incorrect assessment answer         → Unqualified
 *  - AI score below the minimum              → Unqualified
 *  - AI score at/above minimum & all-correct → In Review
 *
 * Shared by the async evaluation processor and the consent-apply path so both
 * route candidates identically.
 */
export function determinePipelineStageKey(input: PipelineStageInput): string {
  const { STAGES, THRESHOLDS } = CANDIDATE_EVALUATION_CONFIG;

  if (input.assessmentPassed === false) {
    return STAGES.NOT_QUALIFIED;
  }

  return input.matchScore >= THRESHOLDS.MINIMUM_MATCH
    ? STAGES.IN_REVIEW
    : STAGES.NOT_QUALIFIED;
}

/**
 * Short, human-readable reason a candidate was routed to Not Qualified — mirrors
 * the exact rules in `determinePipelineStageKey`. Returns `null` when the
 * candidate qualifies (In Review), so callers can store it unconditionally.
 */
export function describeNotQualifiedReason(
  input: PipelineStageInput
): string | null {
  const reasons: string[] = [];

  if (input.assessmentPassed === false) {
    reasons.push("Failed one or more screening questions");
  }
  if (input.matchScore < CANDIDATE_EVALUATION_CONFIG.THRESHOLDS.MINIMUM_MATCH) {
    reasons.push("AI match score below 50%");
  }

  return reasons.length > 0 ? reasons.join(" · ") : null;
}
