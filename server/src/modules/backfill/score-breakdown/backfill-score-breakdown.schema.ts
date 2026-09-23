import { z } from "zod";
import {
  SCORED_DIMENSION_KEYS,
  SCORE_BREAKDOWN_MAX_REASON_LENGTH,
  SCORE_BREAKDOWN_MAX_TOP_REASONS,
} from "modules/recruitment/candidate-evaluation/gap-analysis-score-breakdown.constants";

/**
 * Only `pointsEarned` and `reason` are read from the model. Weights come from
 * our own constant, so anything the model says about them is ignored — zod
 * strips unknown keys by default.
 */
const aiDimensionSchema = z.object({
  key: z.enum(SCORED_DIMENSION_KEYS),
  pointsEarned: z.number().min(0),
  reason: z.string().min(1).max(SCORE_BREAKDOWN_MAX_REASON_LENGTH),
});

export const scoreBreakdownAiResponseSchema = z.object({
  dimensions: z.array(aiDimensionSchema).length(SCORED_DIMENSION_KEYS.length),
  topReasons: z
    .array(z.string().min(1).max(SCORE_BREAKDOWN_MAX_REASON_LENGTH))
    .max(SCORE_BREAKDOWN_MAX_TOP_REASONS)
    .optional()
    .default([]),
});

export type ScoreBreakdownAiResponse = z.infer<
  typeof scoreBreakdownAiResponseSchema
>;

export function validateScoreBreakdownAiResponse(
  data: unknown
): ScoreBreakdownAiResponse {
  const result = scoreBreakdownAiResponseSchema.safeParse(data);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`Invalid AI score breakdown response: ${errorDetails}`);
  }

  const keys = new Set(result.data.dimensions.map((d) => d.key));
  for (const key of SCORED_DIMENSION_KEYS) {
    if (!keys.has(key)) {
      throw new Error(`Missing dimension: ${key}`);
    }
  }

  return result.data;
}
