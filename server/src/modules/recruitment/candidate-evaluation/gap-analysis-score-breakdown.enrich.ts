import type {
  CandidateGapAnalysisAiResult,
  CandidateGapAnalysisResult,
  GapAnalysisDimension,
} from "./candidate-evaluation-gap-analysis.schema";
import {
  SCORE_BREAKDOWN_SOURCE_EVALUATION,
  isScoredDimensionKey,
  type ScoredDimensionKey,
} from "./gap-analysis-score-breakdown.constants";
import {
  deriveVerdictStatus,
  resolveEarnedPoints,
  sumEarnedPoints,
} from "./gap-analysis-score-breakdown.compute";
import { assembleScoreBreakdown } from "./gap-analysis-score-breakdown.assemble";

/**
 * `points` / `pointsReason` are scoring inputs, not display data. They live in
 * `scoreBreakdown` once computed, so they are stripped from the dimensions to
 * keep a single source of truth.
 */
function stripScoringFields(
  dimensions: GapAnalysisDimension[]
): GapAnalysisDimension[] {
  return dimensions.map((dimension) => {
    const {
      points: _points,
      pointsReason: _pointsReason,
      ...displayOnly
    } = dimension;
    return displayOnly;
  });
}

function collectReasons(
  dimensions: GapAnalysisDimension[]
): Partial<Record<ScoredDimensionKey, string>> {
  const reasons: Partial<Record<ScoredDimensionKey, string>> = {};
  for (const dimension of dimensions) {
    if (!isScoredDimensionKey(dimension.key)) continue;
    const reason = dimension.pointsReason?.trim();
    if (reason) reasons[dimension.key] = reason;
  }
  return reasons;
}

/**
 * Turns the raw model response into the result the pipeline consumes: the score
 * is the sum of the scored dimensions' points, so it is explainable by
 * construction and cannot disagree with the breakdown shown in the UI.
 */
export function enrichGapAnalysisResult(
  ai: CandidateGapAnalysisAiResult,
  model: string
): CandidateGapAnalysisResult {
  const { earned, derived } = resolveEarnedPoints(ai.dimensions);
  const matchPercentage = sumEarnedPoints(earned);

  const scoreBreakdown = assembleScoreBreakdown({
    totalScore: matchPercentage,
    model,
    source: SCORE_BREAKDOWN_SOURCE_EVALUATION,
    earned,
    reasons: collectReasons(ai.dimensions),
    derived,
  });

  return {
    matchPercentage,
    verdict: ai.verdict,
    verdictStatus: deriveVerdictStatus(matchPercentage),
    dimensions: stripScoringFields(ai.dimensions),
    scoreBreakdown,
  };
}
