import {
  RESUME_SEARCH_CUTOFF_FRACTION,
  RESUME_SEARCH_MAX_NEAR_MISSES,
  RESUME_SEARCH_MAX_RESULTS,
  RESUME_SEARCH_RRF_K,
} from "../resume-search.constants";

export interface FusionInput {
  candidateId: string;
  vectorRank: number | null;
  keywordRank: number | null;
}

export interface FusedRow {
  candidateId: string;
  score: number;
  rank: number;
}

export interface FusionResult {
  rows: FusedRow[];
  truncated: boolean;
}

/**
 * Reciprocal Rank Fusion. Runs here rather than in SQL because K, the cutoff
 * and the cap are product tuning knobs, the result set is already walked in JS
 * to derive matchedOn, and at a few hundred rows a SQL sort saves nothing.
 *
 * In degraded mode only keywordRank is present, so this collapses to plain
 * ts_rank_cd ordering with no special case.
 */
export interface FusionOptions {
  /**
   * Set false when hard requirements already decided the result set. The cutoff
   * is a relevance heuristic, and a candidate who satisfies every stated
   * requirement must not be dropped for ranking weakly — or, with no ranking
   * signal at all, for scoring zero.
   */
  applyCutoff?: boolean;
}

export function fuseByReciprocalRank(
  rows: FusionInput[],
  options?: FusionOptions
): FusionResult {
  const scored = rows.map((row) => ({
    candidateId: row.candidateId,
    score:
      (row.vectorRank != null
        ? 1 / (RESUME_SEARCH_RRF_K + row.vectorRank)
        : 0) +
      (row.keywordRank != null
        ? 1 / (RESUME_SEARCH_RRF_K + row.keywordRank)
        : 0),
  }));

  // candidateId tie-break keeps ordering stable across identical scores.
  scored.sort(
    (a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId)
  );

  const applyCutoff = options?.applyCutoff ?? true;
  const top = scored[0]?.score ?? 0;

  if (applyCutoff && top <= 0) return { rows: [], truncated: false };

  const survivors = applyCutoff
    ? scored.filter((row) => row.score / top >= RESUME_SEARCH_CUTOFF_FRACTION)
    : scored;

  // With the cutoff off, the caller splits these into matches and near misses
  // and caps each bucket itself, so leave room for both.
  const cap = applyCutoff
    ? RESUME_SEARCH_MAX_RESULTS
    : RESUME_SEARCH_MAX_RESULTS + RESUME_SEARCH_MAX_NEAR_MISSES;

  return {
    rows: survivors.slice(0, cap).map((row, index) => ({
      candidateId: row.candidateId,
      score: Number(row.score.toFixed(6)),
      rank: index + 1,
    })),
    truncated: survivors.length > cap,
  };
}
