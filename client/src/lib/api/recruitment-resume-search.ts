/**
 * Resume Semantic Search API
 *
 * Focused client for `/recruitment/candidates/job/:jobId/resume-search`.
 * Spread into `recruitmentApi` so existing `api.recruitment.*` callers stay unchanged.
 */

import { request } from "./core";

export type ResumeSearchMatchKind = "keyword" | "related" | "semantic";

export interface ResumeSearchMatchedTerm {
  term: string;
  kind: ResumeSearchMatchKind;
}

/** `unknown` means it could not be checked — not that the candidate failed it. */
export type ResumeSearchConditionState = "met" | "missing" | "unknown";

export interface ResumeSearchCondition {
  label: string;
  state: ResumeSearchConditionState;
}

/** Which board list a match belongs to. Sent only by the connector search. */
export type ResumeSearchRowKind = "candidate" | "pool_match";

export interface ResumeSearchMatch {
  /** A candidate id, or a pool-match id when `rowKind` is `pool_match`. */
  candidateId: string;
  rowKind?: ResumeSearchRowKind;
  score: number;
  rank: number;
  matchedOn: ResumeSearchMatchedTerm[];
  /** False marks a near miss — met some requirements but not all. */
  allConditionsMet: boolean;
  /** Empty when the query stated no hard requirements. */
  conditions: ResumeSearchCondition[];
}

export interface ResumeSearchResponse {
  query: string;
  matches: ResumeSearchMatch[];
  totalCandidates: number;
  indexedCandidates: number;
  /** AI ranking unavailable — matches came from keyword search alone. */
  degraded: boolean;
  truncated: boolean;
  /** Hard requirements understood from the query. */
  constraints: string[];
  /** Query understanding unavailable — no requirements were applied. */
  plannerUnavailable: boolean;
  unknownExperienceCount: number;
  /** Leading `matches` meeting every requirement; the rest are near misses. */
  exactMatchCount: number;
}

export const recruitmentResumeSearchApi = {
  searchJobCandidateResumes: (jobId: string, query: string) =>
    request<ResumeSearchResponse>(
      `/recruitment/candidates/job/${jobId}/resume-search`,
      { method: "POST", body: JSON.stringify({ query }) }
    ),

  /**
   * The connector's own board. A separate route, not the same one with a
   * different caller: the recruiter route reads every candidate on the job,
   * so this one scopes to the connector's referrals and pool matches.
   */
  searchConnectorJobResumes: (jobId: string, query: string) =>
    request<ResumeSearchResponse>(
      `/recruitment/connector-pipeline/job/${jobId}/resume-search`,
      { method: "POST", body: JSON.stringify({ query }) }
    ),
};
