import { toUTC } from "utils/dayjs";
import type { EarnedPoints } from "./gap-analysis-score-breakdown.compute";
import type {
  ScoreBreakdown,
  ScoreBreakdownDimension,
  ScoreBreakdownReconciliation,
} from "./gap-analysis-score-breakdown.types";
import {
  SCORED_DIMENSION_KEYS,
  SCORE_BREAKDOWN_MAX_TOP_REASONS,
  SCORE_BREAKDOWN_TOTAL_WEIGHT,
  SCORE_BREAKDOWN_VERSION,
  SCORE_BREAKDOWN_WEIGHTS,
  type ScoredDimensionKey,
} from "./gap-analysis-score-breakdown.constants";

export interface AssembleScoreBreakdownInput {
  totalScore: number;
  model: string;
  /** "evaluation" for the inline path, "backfill" for the annotation job. */
  source: string;
  earned: EarnedPoints;
  reasons: Partial<Record<ScoredDimensionKey, string>>;
  topReasons?: string[];
  /** "rescaled" only where points were fitted to an already-stored score. */
  reconciled?: ScoreBreakdownReconciliation;
  derived?: ScoredDimensionKey[];
}

/**
 * Falls back to the dimensions that lost the most points when the model does
 * not supply usable top reasons.
 */
function resolveTopReasons(
  supplied: string[] | undefined,
  dimensions: ScoreBreakdownDimension[]
): string[] {
  const cleaned = (supplied ?? [])
    .map((reason) => reason.trim())
    .filter((reason) => reason.length > 0)
    .slice(0, SCORE_BREAKDOWN_MAX_TOP_REASONS);

  if (cleaned.length > 0) return cleaned;

  return dimensions
    .filter((dimension) => dimension.pointsLost > 0)
    .sort((a, b) => b.pointsLost - a.pointsLost)
    .slice(0, SCORE_BREAKDOWN_MAX_TOP_REASONS)
    .map((dimension) => dimension.reason);
}

export function assembleScoreBreakdown(
  input: AssembleScoreBreakdownInput
): ScoreBreakdown {
  const dimensions: ScoreBreakdownDimension[] = SCORED_DIMENSION_KEYS.map(
    (key) => {
      const weight = SCORE_BREAKDOWN_WEIGHTS[key];
      const pointsEarned = input.earned[key];
      return {
        key,
        weight,
        pointsEarned,
        // Derived in code — the model's arithmetic is never trusted.
        pointsLost: weight - pointsEarned,
        reason: input.reasons[key]?.trim() || "No reason provided",
      };
    }
  );

  return {
    version: SCORE_BREAKDOWN_VERSION,
    source: input.source,
    generatedAt: toUTC().toISOString(),
    model: input.model,
    totalScore: input.totalScore,
    lostPoints: SCORE_BREAKDOWN_TOTAL_WEIGHT - input.totalScore,
    reconciled: input.reconciled ?? "exact",
    dimensions,
    topReasons: resolveTopReasons(input.topReasons, dimensions),
    ...(input.derived?.length ? { derived: input.derived } : {}),
  };
}
