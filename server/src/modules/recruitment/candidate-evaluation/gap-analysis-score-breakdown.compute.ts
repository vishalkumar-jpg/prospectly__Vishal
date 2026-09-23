import {
  BADGE_PARTIAL_POINTS_RATIO,
  SCORED_DIMENSION_KEYS,
  SCORE_BREAKDOWN_WEIGHTS,
  VERDICT_STATUS_OK_MIN,
  VERDICT_STATUS_PARTIAL_MIN,
  type ScoredDimensionKey,
} from "./gap-analysis-score-breakdown.constants";

export type EarnedPoints = Record<ScoredDimensionKey, number>;

export interface ResolvedPoints {
  earned: EarnedPoints;
  /** Dimensions whose points the model omitted and we inferred from its badge. */
  derived: ScoredDimensionKey[];
}

/** Minimal shape needed from a gap-analysis dimension to score it. */
export interface ScorableDimension {
  key: string;
  points?: number;
  badge?: { status?: string };
}

function emptyEarned(): EarnedPoints {
  return SCORED_DIMENSION_KEYS.reduce<EarnedPoints>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as EarnedPoints);
}

function clampToWeight(value: number, weight: number): number {
  return Math.min(Math.max(Math.round(value), 0), weight);
}

/**
 * Fallback when the model omits a dimension's points: award from the status it
 * did assign, so the score stays grounded in its own assessment rather than
 * defaulting to zero and unfairly rejecting a candidate.
 */
export function pointsFromBadgeStatus(
  status: string | undefined,
  weight: number
): number {
  if (status === "ok") return weight;
  if (status === "partial") {
    return clampToWeight(weight * BADGE_PARTIAL_POINTS_RATIO, weight);
  }
  return 0;
}

export function resolveEarnedPoints(
  dimensions: ScorableDimension[]
): ResolvedPoints {
  const byKey = new Map<string, ScorableDimension>();
  for (const dimension of dimensions) {
    if (dimension?.key) byKey.set(dimension.key, dimension);
  }

  const earned = emptyEarned();
  const derived: ScoredDimensionKey[] = [];

  for (const key of SCORED_DIMENSION_KEYS) {
    const weight = SCORE_BREAKDOWN_WEIGHTS[key];
    const dimension = byKey.get(key);
    const points = dimension?.points;

    if (typeof points === "number" && Number.isFinite(points)) {
      earned[key] = clampToWeight(points, weight);
      continue;
    }

    earned[key] = pointsFromBadgeStatus(dimension?.badge?.status, weight);
    derived.push(key);
  }

  return { earned, derived };
}

export function sumEarnedPoints(earned: EarnedPoints): number {
  return SCORED_DIMENSION_KEYS.reduce((total, key) => total + earned[key], 0);
}

/**
 * Keeps the verdict badge from contradicting the score beside it, which the
 * AI-supplied value could previously do.
 */
export function deriveVerdictStatus(score: number): "ok" | "partial" | "gap" {
  if (score >= VERDICT_STATUS_OK_MIN) return "ok";
  if (score >= VERDICT_STATUS_PARTIAL_MIN) return "partial";
  return "gap";
}
