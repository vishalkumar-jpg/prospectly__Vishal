import {
  SCORED_DIMENSION_KEYS,
  SCORE_BREAKDOWN_MAX_TOP_REASONS,
  SCORE_BREAKDOWN_WEIGHTS,
} from "modules/recruitment/candidate-evaluation/gap-analysis-score-breakdown.constants";
import type { ScoreBreakdownPromptDimension } from "./backfill-score-breakdown.projection";

const WEIGHT_TABLE = SCORED_DIMENSION_KEYS.map(
  (key) => `- ${key}: max ${String(SCORE_BREAKDOWN_WEIGHTS[key])} points`
).join("\n");

const OUTPUT_SHAPE = `{
  "dimensions": [
    { "key": "skillsMatch", "pointsEarned": 29, "reason": "Short factual reason for the points not earned" }
  ],
  "topReasons": ["Most important reason", "Second reason", "Third reason"]
}`;

export interface ScoreBreakdownPromptInput {
  totalScore: number;
  dimensions: ScoreBreakdownPromptDimension[];
}

/**
 * The score already exists and must not be re-judged — the model's only job is
 * to explain how that number is distributed across six fixed-weight dimensions.
 */
export function buildScoreBreakdownPrompt(
  input: ScoreBreakdownPromptInput
): string {
  const score = String(input.totalScore);

  return `You are a recruitment analyst explaining an existing candidate match score.

A completed gap analysis already scored this candidate at exactly ${score} out of 100.
That score is FINAL. Do not re-judge the candidate and do not propose a different score.
Your only task is to explain how those ${score} points are distributed.

Each dimension has a FIXED maximum number of points. These maximums never change:
${WEIGHT_TABLE}

The data below contains six dimensions, but only the ones listed above are scored.
Work eligibility and employment type are context only — do not award them points.

Rules:
- Return all ${String(SCORED_DIMENSION_KEYS.length)} dimensions, using exactly these keys: ${SCORED_DIMENSION_KEYS.join(", ")}
- pointsEarned must be a whole number between 0 and that dimension's maximum
- The ${String(SCORED_DIMENSION_KEYS.length)} pointsEarned values MUST add up to exactly ${score}
- Award a high proportion of the maximum where the dimension badge is "ok", a middling proportion where it is "partial", and a low proportion where it is "gap"
- reason: one short factual sentence explaining the points NOT earned, grounded only in the gaps listed below for that dimension
- If a dimension earned its full maximum, set reason to a brief confirmation such as "Fully met"
- Never invent a requirement that does not appear in the data below
- topReasons: up to ${String(SCORE_BREAKDOWN_MAX_TOP_REASONS)} short phrases naming the biggest contributors to the ${String(100 - input.totalScore)} points not earned, ordered most significant first
- Do not include any prose, markdown or commentary outside the JSON

Return ONLY this JSON structure:
${OUTPUT_SHAPE}

GAP ANALYSIS DIMENSIONS:
${JSON.stringify(input.dimensions)}`;
}
