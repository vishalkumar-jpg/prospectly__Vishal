import type { ResumeSearchMatch } from "@/lib/api/recruitment";

export const RESUME_SEARCH_URL_PARAM = "resumeSearch";
export const RESUME_SEARCH_MIN_QUERY_LENGTH = 3;

export type RelevanceTier = "strong" | "good" | "related";

/**
 * Orders candidates by search relevance within a stage column. Unmatched rows
 * sort last, though in practice they are filtered out before this runs.
 */
export function byResumeRank(matchById: Map<string, ResumeSearchMatch>) {
  return (a: { id: string }, b: { id: string }): number =>
    (matchById.get(a.id)?.rank ?? Number.MAX_SAFE_INTEGER) -
    (matchById.get(b.id)?.rank ?? Number.MAX_SAFE_INTEGER);
}

/** Relative to the top hit — RRF scores are not meaningful in absolute terms. */
export function relevanceTier(score: number, topScore: number): RelevanceTier {
  if (topScore <= 0) return "related";
  const ratio = score / topScore;
  if (ratio >= 0.8) return "strong";
  if (ratio >= 0.6) return "good";
  return "related";
}

export const RELEVANCE_TIER_LABEL: Record<RelevanceTier, string> = {
  strong: "Strong",
  good: "Good",
  related: "Related",
};
