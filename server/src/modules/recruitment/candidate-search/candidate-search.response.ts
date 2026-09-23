import type { NormalisedCriteria } from "./criteria/candidate-search-criteria";

/**
 * Wire shapes for cross-job candidate search. The client mirrors these exactly;
 * a field added here without a client counterpart is a field nobody sees.
 */

/**
 * Tri-state, matching `resume-search-condition.cte.ts`. `unknown` means we could
 * not check — an unindexed résumé, an unextracted figure — not that the candidate
 * failed. It renders amber with the word "unchecked", never red (ADR-005 §4).
 */
export type FitSignalState = "met" | "missing" | "unknown";

export type FitSignalKind =
  | "skill"
  /** A job description's nice-to-have: scores, never filters. */
  | "bonus"
  | "query_term"
  | "facet"
  | "range";

export interface FitSignal {
  label: string;
  state: FitSignalState;
  weight: number;
  kind: FitSignalKind;
}

export interface FitResult {
  /** 0–100. Weighted share of every applied criterion satisfied. */
  percent: number;
  signals: FitSignal[];
  /** Applied criteria count — 0 means the caller suppresses the column. */
  criteriaCount: number;
  metCount: number;
}

export interface CandidateSearchApplication {
  /** Candidacy uuid — React key; distinct from the posting. */
  id: string;
  jobId: string;
  stageId: number | null;
}

export interface CandidateSearchRow {
  /** The freshest candidacy's uuid. Dedup runs on a separate identity key. */
  id: string;
  contactId: number | null;
  candidateUserId: string | null;

  name: string | null;
  email: string | null;

  /** coalesce(résumé job_title, contact title) — ADR-005 §10. */
  currentTitle: string | null;
  /** coalesce(metadata.currentEmployer, contact company). Null renders as an em dash. */
  company: string | null;

  location: string | null;
  /** Null means not extracted — `unknown`, never a zero. */
  experienceYears: number | null;
  educationLevel: string | null;
  source: string | null;

  /** Every in-scope posting this person appears on. */
  jobIds: string[];
  postingCount: number;
  stageIds: number[];
  /** Stage of the freshest candidacy — drives row actions and detail link. */
  stageId: number | null;
  /** One entry per in-scope application, freshest first. */
  applications: CandidateSearchApplication[];

  /** MIN(created_at) across in-scope postings. */
  appliedAt: string | null;

  /** Absent when no criteria are applied — the column is not rendered then. */
  fit: FitResult | null;
  /** RRF fusion score. Ranking input, never displayed. */
  relevance: number | null;
  /** False when the person has no indexed résumé — drives the coverage line. */
  indexed: boolean;
  /** True when the freshest candidacy has an uploaded resume on file. */
  hasResume: boolean;
}

/** §6.6 — the standing accuracy signal, computed per request. */
export interface CandidateSearchCoverage {
  totalCandidates: number;
  withIndexedResume: number;
  withExperienceYears: number;
  withEducationLevel: number;
}

export interface CandidateSearchMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CandidateSearchResponse {
  rows: CandidateSearchRow[];
  meta: CandidateSearchMeta;
  coverage: CandidateSearchCoverage;
  /** Embedding unavailable — results are keyword-ranked. Surfaced, never silent. */
  degraded: boolean;
  /** The scored-set cap bit. Surfaced, never silent. */
  truncated: boolean;
  /** Whether any criterion is applied at all — drives column visibility. */
  hasCriteria: boolean;
}

export interface CandidateSearchCountResponse {
  count: number;
  /**
   * False when a free-text query is applied: `/count` is structured-only, so the
   * number is an upper bound and the UI must say so (ADR-005, plan §7.3).
   */
  textCounted: boolean;
}

export interface SavedSearchSummary {
  id: string;
  title: string;
  /** Re-normalised on read, so a stale payload degrades rather than breaking. */
  criteria: NormalisedCriteria;
  source: "advanced" | "job_description";
  /** What it returned when saved. Display only — a rerun always recounts. */
  resultCountAtSave: number | null;
  isFavorite: boolean;
  lastRunAt: string | null;
  updatedAt: string;
}

/** What the JD sheet shows under "What we read", before the recruiter commits. */
export interface ParsedJobDescription {
  role: string | null;
  seniority: string | null;
  /** Become `skills[]` — they filter. */
  mustHave: string[];
  /** Become `bonus[]` — they score, and never exclude anybody. */
  niceToHave: string[];
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export interface CandidateSearchFacets {
  postings: FacetValue[];
  stages: FacetValue[];
  skills: FacetValue[];
  titles: FacetValue[];
  companies: FacetValue[];
  industries: FacetValue[];
  countries: FacetValue[];
  workModes: FacetValue[];
  employmentTypes: FacetValue[];
  educationLevels: FacetValue[];
  sources: FacetValue[];
}
