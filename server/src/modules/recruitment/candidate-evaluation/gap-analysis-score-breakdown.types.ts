import type { GapDimensionKey } from "./candidate-evaluation-gap-analysis.schema";

export type ScoreBreakdownReconciliation = "exact" | "rescaled";

export interface ScoreBreakdownDimension {
  key: GapDimensionKey;
  /** Fixed weight from the attribution model — never AI-supplied. */
  weight: number;
  pointsEarned: number;
  pointsLost: number;
  reason: string;
}

/**
 * Shape stored under `gap_analysis.scoreBreakdown`. Purely additive — it never
 * replaces `verdict`, `verdictStatus` or `dimensions`, and `totalScore` mirrors
 * the already-stored `match_score` rather than recomputing it.
 *
 * Lives here rather than in the backfill module because it is read on every
 * gap-analysis endpoint and will also be written inline during evaluation.
 */
export interface ScoreBreakdown {
  version: string;
  source: string;
  generatedAt: string;
  model: string;
  totalScore: number;
  lostPoints: number;
  reconciled: ScoreBreakdownReconciliation;
  dimensions: ScoreBreakdownDimension[];
  topReasons: string[];
  /**
   * Dimensions whose points the model omitted and that were inferred from its
   * badge instead. Present only when that fallback actually fired, so a
   * frequently-populated field is a signal the prompt needs tightening.
   */
  derived?: GapDimensionKey[];
}
