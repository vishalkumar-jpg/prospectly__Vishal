import { request } from "./core";

export type RecruitmentEmailLogItem = {
  id: string;
  emailType: string;
  recipientType: string;
  subject: string | null;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  detailType: string | null;
  detailReason: string | null;
  canResend: boolean;
};

export type RecruitmentEmailLogsResponse = {
  logs: RecruitmentEmailLogItem[];
  hasHistoricalGap: boolean;
  audience?: RecruitmentEmailLogsAudience;
};

export type RecruitmentEmailLogsAudience = "connector" | "recruiter";

export const recruitmentEmailLogsApi = {
  getCandidateLogs: (
    candidateId: string,
    audience: RecruitmentEmailLogsAudience
  ) =>
    request<RecruitmentEmailLogsResponse>(
      `/recruitment/email-logs/candidates/${candidateId}?audience=${audience}`
    ),

  getPoolMatchLogs: (matchId: string) =>
    request<RecruitmentEmailLogsResponse>(
      `/recruitment/email-logs/pool-matches/${matchId}`
    ),

  resend: (logId: string, audience: RecruitmentEmailLogsAudience) =>
    request<{ message: string }>(
      `/recruitment/email-logs/${logId}/resend?audience=${audience}`,
      { method: "POST" }
    ),
};

export const RECRUITMENT_EMAIL_RECIPIENT_TYPE_LABELS: Record<string, string> = {
  candidate: "Candidate",
  connector: "Connector",
  recruiter: "Recruiter",
  org_member: "Org member",
};

export const RECRUITMENT_EMAIL_TYPE_LABELS: Record<string, string> = {
  candidate_consent: "Consent request",
  interview_invite: "Interview invite",
  candidate_shortlisted: "Shortlisted",
  connector_shortlisted: "Shortlisted (connector)",
  connector_interview_invite: "Interview invite sent",
  connector_interview_scheduled: "Interview scheduled",
  connector_interview_completed: "Interview completed",
  candidate_hired: "Hired",
  connector_hired: "Hired (connector)",
  candidate_rejected: "Rejected",
  connector_rejected: "Rejected (connector)",
  candidate_payout_setup: "Payout setup",
  connector_payout_setup: "Payout setup (connector)",
  candidate_payout_released: "Payout released",
  connector_payout_released: "Payout released (connector)",
  recruiter_new_candidate: "New candidate",
  interview_booking_error: "Interview booking error",
  new_job_opportunities: "New job opportunities",
  collaborator_added: "Collaborator added",
  candidate_in_review_status: "In Review status update",
  connector_in_review_status: "In Review status (connector)",
};

export const RECRUITER_EMAIL_LOG_STAGES = new Set([
  "in_review",
  "not_qualified",
  "shortlisted",
  "interview_invite_sent",
  "interview_scheduled",
  "interview_completed",
  "hired",
  "rejected",
]);

export const CONNECTOR_EMAIL_LOG_STAGES = new Set([
  "consent_pending",
  "consent_accepted",
  "shortlisted",
  "interview_invite_sent",
  "interview_scheduled",
  "interview_completed",
  "hired",
  "rejected",
]);

/** Pre-referral pool cards on the recruiter job board (consent they sent). */
export const RECRUITER_POOL_EMAIL_LOG_STAGES = new Set(["consent_pending"]);
