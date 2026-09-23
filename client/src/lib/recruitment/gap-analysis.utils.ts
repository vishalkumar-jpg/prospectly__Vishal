import type {
  GapAnalysisPayload,
  GapChip,
  GapDimension,
  GapDimensionDetail,
  GapDimensionKey,
  ScoreBreakdownDimension,
} from "./gap-analysis.types";

const CHIP_PREVIEW_LIMIT = 8;

export const GAP_CHIP_PILL_BASE =
  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors";

const META_GAP_LABEL_PATTERNS = [
  /^insufficient data in resume$/i,
  /^insufficient data$/i,
];

export function isMetaGapLabel(label: string): boolean {
  const trimmed = label.trim();
  return META_GAP_LABEL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function expandChipLabel(label: string): string[] {
  const trimmed = label.trim();
  if (!trimmed) return [];

  const parts = trimmed
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : [trimmed];
}

function chipLabelKey(label: string): string {
  return label.trim().toLowerCase();
}

function detailHasRenderableContent(
  detail: GapDimensionDetail | undefined
): boolean {
  if (!detail) return false;
  if (detail.type === "experience") return detail.bars.length > 0;
  if (detail.type === "vs") {
    return Boolean(detail.left?.title && detail.right?.title);
  }
  if (detail.type === "facts") return detail.facts.length > 0;
  return false;
}

export function dimensionHasExpandableContent(
  dimension: GapDimension
): boolean {
  const matched = normalizeGapChips(dimension.matched);
  const gaps = normalizeGapChips(dimension.gaps);
  if (matched.length > 0 || gaps.length > 0) return true;
  return detailHasRenderableContent(dimension.detail);
}

export function normalizeChipLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const label of labels) {
    for (const expanded of expandChipLabel(label)) {
      const key = chipLabelKey(expanded);
      if (isMetaGapLabel(expanded) || seen.has(key)) continue;
      seen.add(key);
      result.push(expanded);
    }
  }

  return result;
}

export function normalizeGapChips(chips: GapChip[]): GapChip[] {
  const seen = new Set<string>();
  const result: GapChip[] = [];

  for (const chip of chips) {
    for (const label of expandChipLabel(chip.label)) {
      if (isMetaGapLabel(label)) continue;
      const key = `${chip.status}:${chipLabelKey(label)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ label, status: chip.status });
    }
  }

  return result;
}

export function filterDetailFactsAgainstDimension(
  dimension: GapDimension
): GapChip[] {
  const existingLabels = new Set(
    normalizeGapChips([...dimension.matched, ...dimension.gaps]).map((chip) =>
      chipLabelKey(chip.label)
    )
  );

  const detail = dimension.detail;
  if (!detail) return [];
  const facts =
    detail.type === "facts"
      ? detail.facts
      : detail.type === "vs"
        ? (detail.facts ?? [])
        : [];

  return normalizeGapChips(facts).filter(
    (chip) => !existingLabels.has(chipLabelKey(chip.label))
  );
}

export function gapChipPillClass(status: GapChip["status"]): string {
  return `${GAP_CHIP_PILL_BASE} ${chipStatusClass(status)}`;
}

/**
 * The single wording used for every status shown in the Gap Analysis modal.
 * The AI-supplied `badge.label` is deliberately ignored: it is free text and in
 * practice just echoes the raw enum ("ok", "partial"), which reads as a leaked
 * internal token rather than a hiring signal.
 */
const STATUS_LABEL: Record<GapChip["status"], string> = {
  ok: "Strong Match",
  partial: "Partial Match",
  gap: "Limited Match",
};

/** Mirrors VERDICT_STATUS_OK_MIN / VERDICT_STATUS_PARTIAL_MIN on the server. */
const STATUS_OK_MIN_PERCENT = 80;
const STATUS_PARTIAL_MIN_PERCENT = 50;

export function gapStatusLabel(status: GapChip["status"]): string {
  return STATUS_LABEL[status];
}

/**
 * The 0-100 band every status in this modal is derived from, so the overall
 * score, a dimension's points and the words beside them can never disagree.
 * A non-finite value falls through to "gap".
 */
export function scoreStatus(percent: number): GapChip["status"] {
  if (percent >= STATUS_OK_MIN_PERCENT) return "ok";
  if (percent >= STATUS_PARTIAL_MIN_PERCENT) return "partial";
  return "gap";
}

export function matchScoreBadgeClass(score: number): string {
  return chipStatusClass(scoreStatus(score));
}

const RING_COLOR: Record<GapChip["status"], string> = {
  ok: "hsl(var(--brand-success))",
  partial: "hsl(var(--brand-warning))",
  gap: "hsl(var(--brand-destructive))",
};

export function matchScoreRingColor(score: number): string {
  return RING_COLOR[scoreStatus(score)];
}

export function aggregateMatchedGaps(dimensions: GapDimension[]): {
  matched: string[];
  gaps: string[];
} {
  const matchedLabels: string[] = [];
  const gapLabels: string[] = [];

  for (const dim of dimensions) {
    for (const chip of normalizeGapChips(dim.matched)) {
      if (chip.status !== "gap") matchedLabels.push(chip.label);
    }
    for (const chip of normalizeGapChips(dim.gaps)) {
      gapLabels.push(chip.label);
    }
  }

  return {
    matched: normalizeChipLabels(matchedLabels),
    gaps: normalizeChipLabels(gapLabels),
  };
}

export function truncateChipLabels(
  labels: string[],
  limit = CHIP_PREVIEW_LIMIT
): { visible: string[]; hiddenCount: number } {
  if (labels.length <= limit) {
    return { visible: labels, hiddenCount: 0 };
  }
  return {
    visible: labels.slice(0, limit),
    hiddenCount: labels.length - limit,
  };
}

export function chipStatusClass(status: GapChip["status"]): string {
  if (status === "ok") {
    return "border-brand-success/30 bg-brand-success/10 text-brand-success";
  }
  if (status === "partial") {
    return "border-brand-warning/30 bg-brand-warning/10 text-brand-warning";
  }
  return "border-brand-destructive/30 bg-brand-destructive/10 text-brand-destructive";
}

export function badgeStatusClass(status: GapChip["status"]): string {
  if (status === "ok") {
    return "bg-brand-success/10 text-brand-success";
  }
  if (status === "partial") {
    return "bg-brand-warning/10 text-brand-warning";
  }
  return "bg-brand-destructive/10 text-brand-destructive";
}

export function iconBoxStatusClass(status: GapChip["status"]): string {
  if (status === "ok") {
    return "bg-brand-success/10 text-brand-success";
  }
  if (status === "partial") {
    return "bg-brand-warning/10 text-brand-warning";
  }
  return "bg-brand-destructive/10 text-brand-destructive";
}

export function barFillClass(status: GapChip["status"]): string {
  if (status === "ok") return "bg-brand-success";
  if (status === "partial") return "bg-brand-warning";
  return "bg-brand-destructive";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function scoreRingOffset(score: number, circumference = 276): number {
  const clamped = Math.min(100, Math.max(0, score));
  return circumference - (clamped / 100) * circumference;
}

export function hasGapAnalysisContent(data: GapAnalysisPayload): boolean {
  const { matched, gaps } = aggregateMatchedGaps(data.dimensions);
  return matched.length > 0 || gaps.length > 0;
}

/**
 * Single place the "should we render the score breakdown?" question is
 * answered. Returns null when the payload was never annotated, so every caller
 * degrades to today's UI with one falsy check.
 */
export function scoreBreakdownByKey(
  data: GapAnalysisPayload
): Map<GapDimensionKey, ScoreBreakdownDimension> | null {
  const dimensions = data.scoreBreakdown?.dimensions;
  if (!dimensions?.length) return null;

  const byKey = new Map<GapDimensionKey, ScoreBreakdownDimension>();
  for (const dimension of dimensions) {
    if (dimension?.key && Number.isFinite(dimension.weight)) {
      byKey.set(dimension.key, dimension);
    }
  }

  return byKey.size > 0 ? byKey : null;
}

/** Fill percentage for a dimension's points bar, clamped to 0-100. */
export function scoreBreakdownFillPercent(
  entry: ScoreBreakdownDimension
): number {
  if (entry.weight <= 0) return 0;
  const percent = (entry.pointsEarned / entry.weight) * 100;
  return Math.min(100, Math.max(0, percent));
}

/**
 * A dimension's status, resolved from the points it actually earned rather than
 * from the badge the model wrote, so the label and colour always agree with the
 * points chip beside them.
 *
 * Falls back to the AI badge for the two unscored dimensions (work eligibility,
 * employment type) and for any row written before the score breakdown existed.
 */
export function dimensionStatus(
  dimension: GapDimension,
  breakdown?: ScoreBreakdownDimension
): GapChip["status"] {
  if (!breakdown || breakdown.weight <= 0) return dimension.badge.status;

  const percent = scoreBreakdownFillPercent(breakdown);
  if (!Number.isFinite(percent)) return dimension.badge.status;

  return scoreStatus(percent);
}
