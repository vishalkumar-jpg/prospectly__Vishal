/**
 * Cross-job candidate search API.
 *
 * POST for search, URL for applied state (ADR-005 §10): criteria are large,
 * contain free text and trigger paid calls, so they stay out of URLs, access
 * logs and proxy caches. Shareability comes from the page mirroring applied
 * criteria into compact search params, not from a GET.
 */

import { request } from "./core";
import {
  toCountRequestBody,
  toRequestBody,
  type CandidateSearchCriteria,
} from "@/lib/recruitment/candidate-search.criteria";

/** `unknown` means we could not check — amber, never a red miss. */
export type FitSignalState = "met" | "missing" | "unknown";
export type FitSignalKind = "skill" | "query_term" | "facet" | "range";

export interface FitSignal {
  label: string;
  state: FitSignalState;
  weight: number;
  kind: FitSignalKind;
}

export interface FitResult {
  percent: number;
  signals: FitSignal[];
  /** 0 means no criteria applied — the Match % column is not rendered. */
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
  id: string;
  contactId: number | null;
  candidateUserId: string | null;
  name: string | null;
  email: string | null;
  currentTitle: string | null;
  /** Null renders as an em dash — candidates with no contact row have none. */
  company: string | null;
  location: string | null;
  /** Null means not extracted: `unknown`, never a zero. */
  experienceYears: number | null;
  educationLevel: string | null;
  source: string | null;
  jobIds: string[];
  postingCount: number;
  stageIds: number[];
  stageId: number | null;
  /** One entry per in-scope application, freshest first. */
  applications: CandidateSearchApplication[];
  appliedAt: string | null;
  fit: FitResult | null;
  relevance: number | null;
  indexed: boolean;
  /** True when the freshest candidacy has an uploaded resume on file. */
  hasResume: boolean;
}

/** The standing accuracy signal — drives the always-visible coverage line. */
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
  /** Keyword-ranked fallback. Surfaced in an info bar, never silent. */
  degraded: boolean;
  /** The scored-set cap bit. Surfaced, never silent. */
  truncated: boolean;
  hasCriteria: boolean;
}

export interface CandidateSearchCountResponse {
  count: number;
  /**
   * False when a free-text query is applied: `/count` is structured-only, so the
   * drawer footer is an upper bound and must say so rather than print a number
   * the next screen contradicts.
   */
  textCounted: boolean;
}

/** What the JD sheet shows under "What we read", before the recruiter commits. */
export interface ParsedJobDescription {
  role: string | null;
  seniority: string | null;
  /** Become skills[] — they filter. */
  mustHave: string[];
  /** Become bonus[] — they score, and never exclude anybody. */
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

/** A stored search. `criteria` is the derived criteria, never the JD document. */
export type SavedSearchSource = "advanced" | "job_description";

export interface SavedCandidateSearch {
  id: string;
  title: string;
  /**
   * Server-owned, but written by an older build's criteria shape as easily as
   * this one — read it through `blankCriteria()` before applying, never raw.
   */
  criteria: Partial<CandidateSearchCriteria>;
  criteriaVersion: number;
  source: SavedSearchSource;
  /** What it returned when saved. Display only — a rerun always recounts. */
  resultCountAtSave: number | null;
  lastRunAt: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedSearchInput {
  title: string;
  criteria: Record<string, unknown>;
  source?: SavedSearchSource;
  resultCountAtSave?: number;
}

export const recruitmentCandidateSearchApi = {
  searchCandidates: (criteria: CandidateSearchCriteria) =>
    request<CandidateSearchResponse>("/recruitment/candidate-search", {
      method: "POST",
      body: JSON.stringify(toRequestBody(criteria)),
    }),

  /**
   * Structured filters only — no embedding, no planner call. This is what makes
   * the drawer footer affordable to recount on every draft change.
   */
  countCandidates: (criteria: CandidateSearchCriteria) =>
    request<CandidateSearchCountResponse>(
      "/recruitment/candidate-search/count",
      { method: "POST", body: JSON.stringify(toCountRequestBody(criteria)) }
    ),

  /**
   * Extraction only. Ranking happens on the normal search call once the sheet
   * commits, so this never returns candidates.
   */
  parseJobDescription: (text: string) =>
    request<ParsedJobDescription>(
      "/recruitment/candidate-search/job-description/parse",
      { method: "POST", body: JSON.stringify({ text }) }
    ),

  /**
   * Same extraction as `parseJobDescription`, from an uploaded PDF the browser
   * cannot turn into text on its own. Multipart, so no `Content-Type` header is
   * set by hand — the boundary is the browser's to choose.
   */
  parseJobDescriptionFile: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<ParsedJobDescription>(
      "/recruitment/candidate-search/job-description/parse-file",
      { method: "POST", body: form }
    );
  },

  // ------------------------------------------------------- saved searches --

  listSavedSearches: () =>
    request<SavedCandidateSearch[]>("/recruitment/candidate-search/saved"),

  createSavedSearch: (input: CreateSavedSearchInput) =>
    request<SavedCandidateSearch>("/recruitment/candidate-search/saved", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  renameSavedSearch: (id: string, title: string) =>
    request<SavedCandidateSearch>(`/recruitment/candidate-search/saved/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),

  favoriteSavedSearch: (id: string, isFavorite: boolean) =>
    request<SavedCandidateSearch>(
      `/recruitment/candidate-search/saved/${id}/favorite`,
      { method: "PATCH", body: JSON.stringify({ isFavorite }) }
    ),

  /** Bumps `lastRunAt` and returns the row whose criteria should be applied. */
  runSavedSearch: (id: string) =>
    request<SavedCandidateSearch>(
      `/recruitment/candidate-search/saved/${id}/run`,
      { method: "POST" }
    ),

  deleteSavedSearch: (id: string) =>
    request<void>(`/recruitment/candidate-search/saved/${id}`, {
      method: "DELETE",
    }),

  getCandidateSearchFacets: () =>
    request<CandidateSearchFacets>("/recruitment/candidate-search/facets"),
};
