import type { ResumeSearchRowKind } from "./resume-search.scope";

/**
 * `keyword` — the term literally matched a query token.
 * `related`  — close lexical variant (postgres/postgresql).
 * `semantic` — no literal overlap; the vector matched the resume as a whole.
 */
export type ResumeSearchMatchKind = "keyword" | "related" | "semantic";

export interface ResumeSearchMatchedTerm {
  term: string;
  kind: ResumeSearchMatchKind;
}

/**
 * `unknown` is deliberately distinct from `missing`: an unindexed resume or an
 * unextracted experience figure means we could not check, which is not the same
 * as the candidate failing the requirement.
 */
export type ResumeSearchConditionState = "met" | "missing" | "unknown";

export interface ResumeSearchCondition {
  label: string;
  state: ResumeSearchConditionState;
}

export interface ResumeSearchMatch {
  /**
   * The board row this match belongs to. A candidate id, unless `rowKind` says
   * `pool_match` — the connector board searches contacts that have no candidate
   * record yet, and those are keyed on the pool match instead.
   */
  candidateId: string;
  /** Absent on the recruiter path, where every row is a candidate. */
  rowKind?: ResumeSearchRowKind;
  score: number;
  rank: number;
  matchedOn: ResumeSearchMatchedTerm[];
  /** True when every hard requirement was met, or none were stated. */
  allConditionsMet: boolean;
  /** Empty when the query stated no hard requirements. */
  conditions: ResumeSearchCondition[];
}

export interface ResumeSearchResult {
  /** Normalized echo of what was actually searched. */
  query: string;
  matches: ResumeSearchMatch[];
  totalCandidates: number;
  indexedCandidates: number;
  /** Embedding unavailable — results are keyword-ranked only. */
  degraded: boolean;
  /** More candidates passed the cutoff than the result cap allows. */
  truncated: boolean;
  /** Hard requirements applied, in the order they are shown. */
  constraints: string[];
  /** Query planning failed — no hard requirements were applied. */
  plannerUnavailable: boolean;
  /** Candidates whose experience could not be checked against a stated minimum. */
  unknownExperienceCount: number;
  /** Candidates meeting every requirement; the rest of `matches` are near misses. */
  exactMatchCount: number;
}
