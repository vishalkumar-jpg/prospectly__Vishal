import {
  GAP_DIMENSION_KEYS,
  type GapAnalysisStored,
  type GapDimensionKey,
} from "modules/recruitment/candidate-evaluation/candidate-evaluation-gap-analysis.schema";
import {
  SCORE_BREAKDOWN_MAX_CHIPS_PER_LIST,
  SCORE_BREAKDOWN_MAX_CHIP_LABEL_LENGTH,
  SCORE_BREAKDOWN_MAX_SUBTITLE_LENGTH,
} from "./backfill-score-breakdown.constants";

export interface ScoreBreakdownPromptDimension {
  key: GapDimensionKey;
  summary: string;
  badgeStatus: string;
  matched: string[];
  partiallyMatched: string[];
  gaps: string[];
}

function truncate(value: string, maxLength: number): string {
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function chipLabels(
  chips: { label: string; status: string }[] | undefined,
  statuses: string[]
): string[] {
  if (!Array.isArray(chips)) return [];
  return chips
    .filter((chip) => statuses.includes(chip.status))
    .map((chip) => truncate(chip.label, SCORE_BREAKDOWN_MAX_CHIP_LABEL_LENGTH))
    .filter((label) => label.length > 0)
    .slice(0, SCORE_BREAKDOWN_MAX_CHIPS_PER_LIST);
}

/**
 * Flattens the stored gap analysis into the minimum the AI needs to attribute
 * points: dimension key, its badge, and the chip labels.
 *
 * The `detail` blocks (experience bars, vs-compare, facts) are dropped on
 * purpose — the shared Gemini client silently truncates prompts at 15k
 * characters, and those blocks would crowd out the instructions.
 *
 * Returns null when the stored blob does not cover all six dimensions. Rather
 * than invent points for a missing dimension, the caller skips the row.
 */
export function projectDimensionsForPrompt(
  stored: GapAnalysisStored
): ScoreBreakdownPromptDimension[] | null {
  const byKey = new Map<string, GapAnalysisStored["dimensions"][number]>();
  for (const dimension of stored.dimensions ?? []) {
    if (dimension?.key) {
      byKey.set(dimension.key, dimension);
    }
  }

  const projected: ScoreBreakdownPromptDimension[] = [];
  for (const key of GAP_DIMENSION_KEYS) {
    const dimension = byKey.get(key);
    if (!dimension) return null;

    projected.push({
      key,
      summary: truncate(
        dimension.subtitle ?? "",
        SCORE_BREAKDOWN_MAX_SUBTITLE_LENGTH
      ),
      badgeStatus: dimension.badge?.status ?? "partial",
      matched: chipLabels(dimension.matched, ["ok"]),
      partiallyMatched: chipLabels(dimension.matched, ["partial"]),
      gaps: chipLabels(dimension.gaps, ["gap", "partial", "ok"]),
    });
  }

  return projected;
}
