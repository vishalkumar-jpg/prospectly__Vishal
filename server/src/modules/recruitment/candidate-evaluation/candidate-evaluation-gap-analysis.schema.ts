import { z } from "zod";
import type { ScoreBreakdown } from "./gap-analysis-score-breakdown.types";
import { sanitizeGapAnalysisResponse } from "./gap-analysis-sanitize";

export const GAP_DIMENSION_KEYS = [
  "skillsMatch",
  "experienceMatch",
  "educationMatch",
  "domainKnowledge",
  "workEligibility",
  "employmentTypeCompatibility",
] as const;

export type GapDimensionKey = (typeof GAP_DIMENSION_KEYS)[number];

const chipStatusSchema = z.enum(["ok", "partial", "gap"]);
const badgeStatusSchema = z.enum(["ok", "partial", "gap"]);

const gapChipSchema = z.object({
  label: z.string().min(1),
  status: chipStatusSchema,
});

const gapDimensionBadgeSchema = z.object({
  label: z.string().min(1),
  status: badgeStatusSchema,
});

const experienceBarSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  valueStatus: chipStatusSchema,
  fillPercent: z.number().min(0).max(100),
  fillStatus: chipStatusSchema,
  reqMarkPercent: z.number().min(0).max(100).optional(),
});

const vsSideSchema = z.object({
  kicker: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  isRequirement: z.boolean().optional(),
});

const gapDimensionDetailSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("experience"),
    bars: z.array(experienceBarSchema).min(1),
    note: z.string().optional(),
  }),
  z.object({
    type: z.literal("vs"),
    left: vsSideSchema,
    right: vsSideSchema,
    compareStatus: badgeStatusSchema,
    facts: z.array(gapChipSchema).optional(),
  }),
  z.object({
    type: z.literal("facts"),
    facts: z.array(gapChipSchema).min(1),
  }),
]);

const gapDimensionSchema = z.object({
  key: z.enum(GAP_DIMENSION_KEYS),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  badge: gapDimensionBadgeSchema,
  matched: z.array(gapChipSchema),
  gaps: z.array(gapChipSchema),
  detail: gapDimensionDetailSchema.optional(),
  /**
   * Scoring fields, supplied only for the four scored dimensions. Optional so a
   * partial response still validates — missing points are inferred from the
   * badge rather than failing the whole evaluation. Stripped before storage.
   */
  points: z.number().optional(),
  pointsReason: z.string().optional(),
});

/**
 * What the model actually returns. It no longer supplies an overall percentage
 * or verdict status — both are computed from the per-dimension points.
 */
export const candidateGapAnalysisAiSchema = z.object({
  verdict: z.string().min(1),
  dimensions: z.array(gapDimensionSchema).length(6),
});

export type CandidateGapAnalysisAiResult = z.infer<
  typeof candidateGapAnalysisAiSchema
>;

export type GapAnalysisDimension =
  CandidateGapAnalysisAiResult["dimensions"][number];

/**
 * The enriched result the rest of the pipeline consumes. `matchPercentage` is
 * the sum of the scored dimensions' points and `verdictStatus` is its band, so
 * the headline number and the breakdown can never disagree.
 */
export interface CandidateGapAnalysisResult {
  matchPercentage: number;
  verdict: string;
  verdictStatus: "ok" | "partial" | "gap";
  dimensions: GapAnalysisDimension[];
  scoreBreakdown: ScoreBreakdown;
}

export type GapAnalysisStored = Pick<
  CandidateGapAnalysisResult,
  "verdict" | "verdictStatus" | "dimensions"
> & {
  scoreBreakdown?: ScoreBreakdown;
};

export function validateCandidateGapAnalysisResponse(
  data: unknown
): CandidateGapAnalysisAiResult {
  const sanitized = sanitizeGapAnalysisResponse(data);
  const result = candidateGapAnalysisAiSchema.safeParse(sanitized);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    throw new Error(`Invalid AI gap analysis response: ${errorDetails}`);
  }
  const keys = new Set(result.data.dimensions.map((d) => d.key));
  for (const key of GAP_DIMENSION_KEYS) {
    if (!keys.has(key)) {
      throw new Error(`Missing dimension: ${key}`);
    }
  }
  return result.data;
}
