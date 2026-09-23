import type {
  ConnectorCandidate,
  InboxCandidate,
} from "@/pages/recruitment/connector-pipeline/types";
import { hasUploadedResume } from "@/pages/recruitment/connector-pipeline/connector-to-inbox-candidate";

const BLOCKED_POOL_STATUSES = new Set([
  "processing",
  "failed",
  "consent_declined",
  "consent_superseded",
  "connector_declined",
]);

const REPLACEABLE_POOL_STATUSES = new Set(["pending", "consent_pending"]);

export function canReplacePoolResume(candidate: InboxCandidate): boolean {
  if (
    candidate.source !== "connector_uploaded" &&
    !candidate.resumeFileName &&
    !candidate.linkedUploadJob?.fileName
  ) {
    return false;
  }
  if (BLOCKED_POOL_STATUSES.has(candidate.status)) return false;
  return REPLACEABLE_POOL_STATUSES.has(candidate.status);
}

const REFERRED_REPLACE_STAGES = new Set<ConnectorCandidate["stage"]>([
  "consent_accepted",
  "not_qualified",
]);

export function canReplaceReferredResume(
  candidate: ConnectorCandidate
): boolean {
  if (!hasUploadedResume(candidate)) return false;
  return REFERRED_REPLACE_STAGES.has(candidate.stage);
}

export type ReplaceResumeTarget =
  | {
      kind: "pool";
      matchId: string;
      candidateName: string;
      jobTitle: string;
      jobCompany: string;
    }
  | {
      kind: "referred";
      candidateId: string;
      matchId?: string | null;
      candidateName: string;
      jobTitle: string;
      jobCompany: string;
    };

export function poolReplaceTarget(
  candidate: InboxCandidate,
  jobTitle: string,
  jobCompany: string
): ReplaceResumeTarget {
  return {
    kind: "pool",
    matchId: candidate.matchId,
    candidateName: candidate.candidateName,
    jobTitle,
    jobCompany,
  };
}

export function referredReplaceTarget(
  candidate: ConnectorCandidate
): ReplaceResumeTarget {
  return {
    kind: "referred",
    candidateId: candidate.id,
    matchId: candidate.matchId,
    candidateName: candidate.candidateName,
    jobTitle: candidate.jobTitle,
    jobCompany: candidate.jobCompany,
  };
}
