/**
 * Connector Pipeline API
 *
 * Focused client for `/recruitment/connector-pipeline/*` endpoints.
 * Spread into `recruitmentApi` so existing `api.recruitment.*` callers stay unchanged.
 */

import { request } from "./core";
import type {
  CandidateDetailResponse,
  ConnectorJobBoardResponse,
} from "./recruitment";

export interface ConnectorCandidateResumeUrlResponse {
  url: string;
  fileName: string | null;
  expiresIn: number;
}

export const connectorPipelineApi = {
  getConnectorJobBoard: (jobId: string) =>
    request<ConnectorJobBoardResponse>(
      `/recruitment/connector-pipeline/job/${jobId}`
    ),

  getConnectorCandidateDetail: (candidateId: string) =>
    request<CandidateDetailResponse>(
      `/recruitment/connector-pipeline/candidate/${candidateId}`
    ),

  getConnectorCandidateResumeUrl: (candidateId: string) =>
    request<ConnectorCandidateResumeUrlResponse>(
      `/recruitment/connector-pipeline/candidate/${candidateId}/resume`
    ),

  getConnectorPoolMatchDetail: (matchId: string) =>
    request<CandidateDetailResponse>(
      `/recruitment/connector-pipeline/match/${matchId}`
    ),
};
