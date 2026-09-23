import type { NormalisedCriteria } from "../criteria/candidate-search-criteria";
import type { FitResult } from "../candidate-search.response";
import type { CandidateSearchDbRow } from "./candidate-search-row.mapper";

export interface ScoredCandidateRow {
  row: CandidateSearchDbRow;
  fit: FitResult | null;
  relevance: number | null;
}

export function applyRelevancePercent(
  scored: ScoredCandidateRow[],
  criteria: NormalisedCriteria,
  summary: { scoreable: number },
  identityOnly = false
): void {
  if (identityOnly || criteria.query === null || summary.scoreable > 0) return;

  const top = scored.reduce(
    (best, entry) => Math.max(best, entry.relevance ?? 0),
    0
  );
  if (top <= 0) return;

  for (const entry of scored) {
    if (!entry.fit || entry.relevance === null) continue;
    entry.fit = {
      ...entry.fit,
      percent: Math.round((100 * entry.relevance) / top),
    };
  }
}

function sortValue(
  entry: ScoredCandidateRow,
  criteria: NormalisedCriteria
): number {
  if (criteria.sort === "fit") return entry.fit?.percent ?? 0;
  if (criteria.sort === "experience") return entry.row.totalYearsExp ?? -1;
  return entry.row.appliedAt ? Date.parse(entry.row.appliedAt) : 0;
}

export function sortScoredRows(
  scored: ScoredCandidateRow[],
  criteria: NormalisedCriteria
): void {
  const direction = criteria.sortDir === "asc" ? 1 : -1;

  scored.sort((a, b) => {
    const primary = sortValue(a, criteria) - sortValue(b, criteria);
    if (primary !== 0) return primary * direction;

    const met = (b.fit?.metCount ?? 0) - (a.fit?.metCount ?? 0);
    if (met !== 0) return met;

    const rel = (b.relevance ?? 0) - (a.relevance ?? 0);
    if (rel !== 0) return rel;

    return a.row.rowId.localeCompare(b.row.rowId);
  });
}
