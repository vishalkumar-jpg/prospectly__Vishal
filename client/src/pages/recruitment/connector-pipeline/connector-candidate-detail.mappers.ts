import type { CandidateDetailResponse } from "@/lib/api/recruitment";
import type { KanbanCandidate } from "@/pages/recruitment/job-kanban/types";
import type { RecruiterStage } from "@/pages/recruitment/job-kanban/types";
import type { ConnectorCandidate, InboxCandidate } from "./types";

const CONNECTOR_TO_RECRUITER_STAGE: Record<string, RecruiterStage> = {
  consent_accepted: "in_review",
  shortlisted: "shortlisted",
  interview_invite_sent: "interview_invite_sent",
  interview_scheduled: "interview_scheduled",
  interview_completed: "interview_completed",
  hired: "hired",
  rejected: "rejected",
};

export function connectorStageToRecruiterStage(
  stage: ConnectorCandidate["stage"]
): RecruiterStage {
  return CONNECTOR_TO_RECRUITER_STAGE[stage] ?? "in_review";
}

export function connectorToKanbanCandidate(
  candidate: ConnectorCandidate,
  detail?: CandidateDetailResponse
): KanbanCandidate {
  const stage = connectorStageToRecruiterStage(candidate.stage);
  return {
    id: candidate.id,
    anonymousId: detail?.anonymousLabel ?? candidate.candidateName,
    avatarColor: "bg-purple-500",
    currentTitle: candidate.currentTitle,
    currentCompany: candidate.currentCompany,
    experienceYears: detail?.totalYearsExp ?? null,
    skills: detail?.skills?.slice(0, 20) ?? [],
    matchScore:
      candidate.matchScore != null && Number.isFinite(candidate.matchScore)
        ? Math.round(candidate.matchScore)
        : null,
    stage,
    stageUpdatedAt: candidate.stageUpdatedAt,
    connectorAnonymousId: "",
    revealedName: candidate.candidateName,
    revealedEmail: candidate.candidateEmail ?? undefined,
    meetingDate: candidate.interviewScheduledAt ?? undefined,
    hasPendingConnectorPayouts: false,
    hasPendingCandidatePayout: false,
    candidatePayoutOnboardingPending: false,
    hasConnectorPayout: Boolean(candidate.payoutStatus),
    hasCandidatePayout: false,
  };
}

export function inboxCandidateToKanban(
  candidate: InboxCandidate,
  detail: CandidateDetailResponse
): KanbanCandidate {
  return {
    id: candidate.matchId,
    anonymousId: candidate.candidateName,
    avatarColor: "bg-emerald-500",
    currentTitle: candidate.candidateTitle,
    currentCompany: candidate.candidateCompany,
    experienceYears: detail.totalYearsExp ?? null,
    skills: detail.skills?.slice(0, 20) ?? [],
    matchScore:
      candidate.matchScore > 0 ? Math.round(candidate.matchScore) : null,
    stage: "in_review",
    stageUpdatedAt: candidate.matchedAt,
    connectorAnonymousId: "",
    revealedName: candidate.candidateName,
    revealedEmail: candidate.candidateEmail ?? undefined,
    hasPendingConnectorPayouts: false,
    hasPendingCandidatePayout: false,
    candidatePayoutOnboardingPending: false,
    hasConnectorPayout: false,
    hasCandidatePayout: false,
  };
}
