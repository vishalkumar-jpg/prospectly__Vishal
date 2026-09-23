export const RECRUITMENT_MATCH_SCORE_RANGE_OPTIONS = [
  { value: "0-10", label: "0–10%" },
  { value: "11-20", label: "11–20%" },
  { value: "21-30", label: "21–30%" },
  { value: "31-40", label: "31–40%" },
  { value: "41-50", label: "41–50%" },
  { value: "51-60", label: "51–60%" },
  { value: "61-70", label: "61–70%" },
  { value: "71-80", label: "71–80%" },
  { value: "81-90", label: "81–90%" },
  { value: "91-100", label: "91–100%" },
] as const;

export type RecruitmentMatchScoreRangeValue =
  (typeof RECRUITMENT_MATCH_SCORE_RANGE_OPTIONS)[number]["value"];

export const MATCH_SCORE_URL_PARAM = "matchScore";

const MATCH_SCORE_RANGE_SET = new Set<string>(
  RECRUITMENT_MATCH_SCORE_RANGE_OPTIONS.map((option) => option.value)
);

/** Parse comma-separated match-score ranges from a URL query value. */
export function parseMatchScoreRangesFromUrl(
  raw: string | null | undefined
): string[] {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((part) => part.trim())
        .filter((part) => MATCH_SCORE_RANGE_SET.has(part))
    ),
  ];
}

/** Serialize selected ranges for the URL (empty → omit param). */
export function serializeMatchScoreRangesForUrl(selected: string[]): string {
  return selected.filter((part) => MATCH_SCORE_RANGE_SET.has(part)).join(",");
}

function parseRangeBounds(range: string): { min: number; max: number } | null {
  const match = /^(\d+)-(\d+)$/.exec(range.trim());
  if (!match) return null;

  const min = Number(match[1]);
  const max = Number(match[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return null;

  return { min, max };
}

export function getMatchScoreRangeLabel(value: string): string {
  return (
    RECRUITMENT_MATCH_SCORE_RANGE_OPTIONS.find(
      (option) => option.value === value
    )?.label ?? value
  );
}

export function getMatchScoreRangeTriggerLabel(selected: string[]): string {
  if (!selected.length) return "All Match Scores";

  if (selected.length === 1) return getMatchScoreRangeLabel(selected[0]);

  const labels = selected.map(getMatchScoreRangeLabel);
  if (selected.length === 2) return labels.join(", ");

  return `${labels.slice(0, 2).join(", ")} +${selected.length - 2}`;
}

/** Returns true when no ranges selected (show all) or score falls in a selected band. */
export function candidateMatchesScoreRanges(
  score: number | null | undefined,
  selectedRanges: string[]
): boolean {
  if (!selectedRanges.length) return true;

  const normalized = selectedRanges.filter((range) =>
    MATCH_SCORE_RANGE_SET.has(range)
  );
  if (!normalized.length) return true;

  if (score == null || !Number.isFinite(score)) return false;

  const rounded = Math.round(score);
  return normalized.some((range) => {
    const bounds = parseRangeBounds(range);
    if (!bounds) return false;
    return rounded >= bounds.min && rounded <= bounds.max;
  });
}
