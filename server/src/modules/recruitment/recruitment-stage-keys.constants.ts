/** Canonical recruitment pipeline stage keys (matches recruitment_stages seed data). */
export const RECRUITMENT_STAGE_KEYS = [
  "processing",
  "in_review",
  "shortlisted",
  "interview_invite_sent",
  "interview_scheduled",
  "interview_completed",
  "hired",
  "rejected",
  "consent_pending",
  "consent_accepted",
  "consent_declined",
  "jd_mismatched",
  "ai_analysis",
  "qualified",
  "not_qualified",
  "connector_declined",
] as const;

export type RecruitmentStageKey = (typeof RECRUITMENT_STAGE_KEYS)[number];
