import { request } from "./core";

export interface ConnectorUploadFilePayload {
  fileName: string;
  filePath: string;
  mimeType: string;
  fileType: string;
  size: number;
  email: string;
}

export interface ConnectorReplaceResumePayload {
  matchId?: string;
  candidateId?: string;
  resume: {
    fileName: string;
    filePath: string;
    mimeType: string;
    fileType: string;
    size: number;
  };
  piiConsent: boolean;
}

export interface ConnectorReplaceResumeResponse {
  message?: string;
  uploadJobId: string;
  matchId: string;
}

export interface ConnectorUploadPayload {
  jobId: string;
  files: ConnectorUploadFilePayload[];
  piiConsent: boolean;
}

export interface ConnectorUploadResponse {
  message?: string;
  uploadCount: number;
  uploadJobIds: string[];
  succeeded?: Array<{
    fileName: string;
    email: string;
    uploadJobId: string;
  }>;
  failed?: Array<{
    fileName: string;
    email: string;
    reason: string;
  }>;
}

export interface RetryUploadJobResponse {
  uploadJobId: string;
  message: string;
}

export interface DismissUploadJobResponse {
  uploadJobId: string;
  message: string;
}

export const recruitmentConnectorUploadApi = {
  connectorUpload: (payload: ConnectorUploadPayload) =>
    request<ConnectorUploadResponse>("/recruitment/connector-upload", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  replaceConnectorResume: (payload: ConnectorReplaceResumePayload) =>
    request<ConnectorReplaceResumeResponse>(
      "/recruitment/connector-upload/replace-resume",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  retryUploadJob: (uploadJobId: string) =>
    request<RetryUploadJobResponse>(
      `/recruitment/connector-upload/${uploadJobId}/retry`,
      { method: "POST" }
    ),

  dismissUploadJob: (uploadJobId: string) =>
    request<DismissUploadJobResponse>(
      `/recruitment/connector-upload/${uploadJobId}`,
      { method: "DELETE" }
    ),
};
