import {
  SCORED_DIMENSION_KEYS,
  SCORE_BREAKDOWN_TOTAL_WEIGHT,
  SCORE_BREAKDOWN_WEIGHTS,
  type ScoredDimensionKey,
} from "modules/recruitment/candidate-evaluation/gap-analysis-score-breakdown.constants";
import type { ScoreBreakdownReconciliation } from "modules/recruitment/candidate-evaluation/gap-analysis-score-breakdown.types";

export type EarnedPoints = Record<ScoredDimensionKey, number>;

export interface ReconcileResult {
  earned: EarnedPoints;
  reconciled: ScoreBreakdownReconciliation;
}

function emptyEarned(): EarnedPoints {
  return SCORED_DIMENSION_KEYS.reduce<EarnedPoints>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as EarnedPoints);
}

export function sumEarnedPoints(earned: EarnedPoints): number {
  return SCORED_DIMENSION_KEYS.reduce((total, key) => total + earned[key], 0);
}

/** Rounds to whole points and clamps each dimension into [0, its weight]. */
export function clampEarnedPoints(
  raw: Partial<Record<ScoredDimensionKey, number>>
): EarnedPoints {
  const clamped = emptyEarned();
  for (const key of SCORED_DIMENSION_KEYS) {
    const weight = SCORE_BREAKDOWN_WEIGHTS[key];
    const value = raw[key];
    const rounded = Number.isFinite(value) ? Math.round(value as number) : 0;
    clamped[key] = Math.min(Math.max(rounded, 0), weight);
  }
  return clamped;
}

/**
 * Walks the total to `target` one point at a time. Adding goes to whichever
 * dimension has the most unused headroom, removing takes from whichever holds
 * the most points, so the shape of the distribution is preserved.
 *
 * Always terminates: `target` is within [0, 100] and the weights total 100, so
 * there is always a dimension with headroom (or points) until the sums agree.
 */
function distributeRemainder(earned: EarnedPoints, target: number): void {
  let guard = SCORE_BREAKDOWN_TOTAL_WEIGHT * 2;

  while (guard > 0) {
    const diff = target - sumEarnedPoints(earned);
    if (diff === 0) return;
    guard -= 1;

    let bestKey: ScoredDimensionKey | null = null;
    let bestRoom = 0;

    for (const key of SCORED_DIMENSION_KEYS) {
      const room =
        diff > 0 ? SCORE_BREAKDOWN_WEIGHTS[key] - earned[key] : earned[key];
      if (room > bestRoom) {
        bestRoom = room;
        bestKey = key;
      }
    }

    if (!bestKey) return;
    earned[bestKey] += diff > 0 ? 1 : -1;
  }
}

/**
 * Forces the scored values to sum to exactly `target` (the already-stored match
 * score). The model is asked to do this itself; this is the code-side guarantee
 * so the popup's arithmetic can never contradict the headline number.
 */
export function reconcileEarnedPoints(
  raw: Partial<Record<ScoredDimensionKey, number>>,
  target: number
): ReconcileResult {
  const earned = clampEarnedPoints(raw);
  const total = sumEarnedPoints(earned);

  if (total === target) {
    return { earned, reconciled: "exact" };
  }

  const rescaled = emptyEarned();
  for (const key of SCORED_DIMENSION_KEYS) {
    const weight = SCORE_BREAKDOWN_WEIGHTS[key];
    // With nothing to scale, fall back to the weight profile itself.
    const share =
      total === 0
        ? (target * weight) / SCORE_BREAKDOWN_TOTAL_WEIGHT
        : (earned[key] * target) / total;
    rescaled[key] = Math.min(Math.max(Math.floor(share), 0), weight);
  }

  distributeRemainder(rescaled, target);

  return { earned: rescaled, reconciled: "rescaled" };
}
