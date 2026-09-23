import type { ConnectorCandidate } from "./types";

export function hasUploadedResume(candidate: ConnectorCandidate): boolean {
  return (
    candidate.poolSource === "connector_uploaded" ||
    Boolean(candidate.resumeFileName)
  );
}
