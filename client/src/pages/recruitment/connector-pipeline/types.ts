export type ConnectorStage =
  | "ai_analysis"
  | "qualified"
  | "not_qualified"
  | "consent_pending"
  | "consent_accepted"
  | "consent_declined"
  | "shortlisted"
  | "interview_invite_sent"
  | "interview_scheduled"
  | "interview_completed"
  | "hired"
  | "rejected"
  | "connector_declined";

export const CONNECTOR_STAGES = [
  {
    id: "consent_pending" as const,
    label: "Consent Pending",
    color: "bg-amber-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
  },
  {
    id: "consent_accepted" as const,
    label: "Consent Accepted",
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
  },
  {
    id: "shortlisted" as const,
    label: "Shortlisted",
    color: "bg-purple-500",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
  },
  {
    id: "interview_invite_sent" as const,
    label: "Interview Invite Sent",
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
  },
  {
    id: "interview_scheduled" as const,
    label: "Interview Scheduled",
    color: "bg-green-500",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
  },
  {
    id: "interview_completed" as const,
    label: "Interview Completed",
    color: "bg-cyan-500",
    bgColor: "bg-cyan-50",
    textColor: "text-cyan-700",
  },
  {
    id: "hired" as const,
    label: "Hired",
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
  },
] as const;

export const CONNECTOR_STAGE_COLORS: Record<
  string,
  {
    color: string;
    bgColor: string;
    textColor: string;
    headBorder: string;
    dotRing: string;
    countBg: string;
    countText: string;
    avatarTint: string;
  }
> = {
  ai_analysis: {
    color: "bg-sky-500",
    bgColor: "bg-sky-50",
    textColor: "text-sky-700",
    headBorder: "border-sky-500",
    dotRing: "ring-sky-500/15",
    countBg: "bg-sky-100",
    countText: "text-sky-700",
    avatarTint: "bg-sky-50 text-sky-700",
  },
  qualified: {
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    headBorder: "border-emerald-500",
    dotRing: "ring-emerald-500/15",
    countBg: "bg-emerald-100",
    countText: "text-emerald-700",
    avatarTint: "bg-emerald-50 text-emerald-700",
  },
  not_qualified: {
    color: "bg-slate-400",
    bgColor: "bg-slate-50",
    textColor: "text-slate-600",
    headBorder: "border-slate-400",
    dotRing: "ring-slate-400/15",
    countBg: "bg-slate-100",
    countText: "text-slate-600",
    avatarTint: "bg-slate-100 text-slate-600",
  },
  consent_pending: {
    color: "bg-amber-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    headBorder: "border-amber-500",
    dotRing: "ring-amber-500/15",
    countBg: "bg-amber-100",
    countText: "text-amber-700",
    avatarTint: "bg-amber-50 text-amber-700",
  },
  consent_accepted: {
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    headBorder: "border-blue-500",
    dotRing: "ring-blue-500/15",
    countBg: "bg-blue-100",
    countText: "text-blue-700",
    avatarTint: "bg-blue-50 text-blue-700",
  },
  shortlisted: {
    color: "bg-purple-500",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
    headBorder: "border-purple-500",
    dotRing: "ring-purple-500/15",
    countBg: "bg-purple-100",
    countText: "text-purple-700",
    avatarTint: "bg-purple-50 text-purple-700",
  },
  interview_invite_sent: {
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    headBorder: "border-blue-500",
    dotRing: "ring-blue-500/15",
    countBg: "bg-blue-100",
    countText: "text-blue-700",
    avatarTint: "bg-blue-50 text-blue-700",
  },
  interview_scheduled: {
    color: "bg-green-500",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    headBorder: "border-green-500",
    dotRing: "ring-green-500/15",
    countBg: "bg-green-100",
    countText: "text-green-700",
    avatarTint: "bg-green-50 text-green-700",
  },
  interview_completed: {
    color: "bg-cyan-500",
    bgColor: "bg-cyan-50",
    textColor: "text-cyan-700",
    headBorder: "border-cyan-500",
    dotRing: "ring-cyan-500/15",
    countBg: "bg-cyan-100",
    countText: "text-cyan-700",
    avatarTint: "bg-cyan-50 text-cyan-700",
  },
  hired: {
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    headBorder: "border-emerald-500",
    dotRing: "ring-emerald-500/15",
    countBg: "bg-emerald-100",
    countText: "text-emerald-700",
    avatarTint: "bg-emerald-50 text-emerald-700",
  },
  consent_declined: {
    color: "bg-rose-500",
    bgColor: "bg-rose-50",
    textColor: "text-rose-700",
    headBorder: "border-rose-500",
    dotRing: "ring-rose-500/15",
    countBg: "bg-rose-100",
    countText: "text-rose-700",
    avatarTint: "bg-rose-50 text-rose-700",
  },
  rejected: {
    color: "bg-slate-400",
    bgColor: "bg-slate-50",
    textColor: "text-slate-600",
    headBorder: "border-slate-400",
    dotRing: "ring-slate-400/15",
    countBg: "bg-slate-100",
    countText: "text-slate-600",
    avatarTint: "bg-slate-100 text-slate-600",
  },
  connector_declined: {
    color: "bg-rose-500",
    bgColor: "bg-rose-50",
    textColor: "text-rose-700",
    headBorder: "border-rose-500",
    dotRing: "ring-rose-500/15",
    countBg: "bg-rose-100",
    countText: "text-rose-700",
    avatarTint: "bg-rose-50 text-rose-700",
  },
};

/**
 * Ordered columns for the per-job candidate board. Pool-sourced pre-referral
 * columns first (AI Analysis / Qualified / Not Qualified), then the referral
 * lifecycle, then terminal/archived columns, with "Not Referred" last.
 */
export const JOB_BOARD_COLUMNS: { id: ConnectorStage; label: string }[] = [
  { id: "ai_analysis", label: "AI Analysis" },
  { id: "qualified", label: "Qualified" },
  { id: "not_qualified", label: "Not Qualified" },
  { id: "consent_pending", label: "Consent Pending" },
  { id: "consent_accepted", label: "Consent Accepted" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "interview_invite_sent", label: "Interview Invite Sent" },
  { id: "interview_scheduled", label: "Interview Scheduled" },
  { id: "interview_completed", label: "Interview Completed" },
  { id: "hired", label: "Hired" },
  { id: "consent_declined", label: "Consent Declined" },
  { id: "rejected", label: "Rejected" },
  { id: "connector_declined", label: "Not Referred" },
];

/** Board columns whose cards are pool matches / upload jobs (inbox-shaped). */
export const JOB_BOARD_POOL_COLUMNS: ConnectorStage[] = [
  "ai_analysis",
  "qualified",
  "not_qualified",
  "consent_pending",
  "consent_declined",
  "connector_declined",
];

export const CONNECTOR_ACTIVE_STAGE_KEYS = [
  "consent_pending",
  "consent_accepted",
  "shortlisted",
  "interview_invite_sent",
  "interview_scheduled",
  "interview_completed",
  "hired",
] as const;

export const CONNECTOR_ARCHIVED_STAGE_KEYS = [
  "consent_declined",
  "rejected",
] as const;

export type ReferralFilter = "all" | "direct" | "public_claim";

export interface ConnectorCandidate {
  id: string;
  candidateName: string;
  candidateEmail: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  stage: ConnectorStage;
  stageUpdatedAt: string;
  jobTitle: string;
  jobCompany: string;
  // The connector's actual payout (post platform fee + split share), not the
  // recruiter's gross. Server computes this via RecruitmentFeeConfigService.
  bountyAmount: number;
  // True when this candidate is split 50/50 between two connectors
  // (sharer + claimer). Drives the inline "Split" badge on the card.
  isSplit: boolean;
  matchScore: number | null;
  consentSentAt: string | null;
  consentAcceptedAt: string | null;
  consentDeclinedReason: string | null;
  rejectionReason: string | null;
  notQualifiedReason: string | null;
  interviewScheduledAt: string | null;
  interviewCompletedAt: string | null;
  inviteSentAt: string | null;
  source?: "consent" | "direct_application";
  matchId?: string | null;
  contactId?: number | null;
  poolSource?: string | null;
  resumeFileName?: string | null;
  matchedAt?: string | null;
  matchedSignals?: string[];
  concerns?: string[];
  gapAnalysis?:
    | import("@/lib/recruitment/gap-analysis.types").GapAnalysisPayload
    | null;
  // Connector-side view of THIS connector's payout row. Null when no payout
  // row exists yet (pre-Hired stages). When `payoutStatus === 'cancelled'`,
  // the card surfaces `payoutCancellationReason` + `payoutCancellationNotes`.
  payoutStatus: string | null;
  payoutCancellationReason: string | null;
  payoutCancellationNotes: string | null;
}

export interface InboxRequest {
  matchId: string;
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  jobLocation: string | null;
  bountyAmount: string;
  contactId: number;
  candidateName: string;
  candidateEmail: string | null;
  candidateTitle: string | null;
  candidateCompany: string | null;
  matchScore: number;
  cosineSimilarity: number | null;
  llmScore: number | null;
  matchedSignals: string[];
  concerns: string[];
  matchedAt: string;
}

export interface InboxLinkedUploadJob {
  uploadJobId: string;
  fileName: string;
  retryCount: number;
  failureReason: string | null;
}

export interface InboxCandidate {
  type?: "pool_match";
  matchId: string;
  contactId: number | null;
  status: string;
  source?: string;
  failureReason?: string | null;
  candidateName: string;
  candidateEmail: string | null;
  candidateTitle: string | null;
  candidateCompany: string | null;
  matchScore: number;
  cosineSimilarity: number | null;
  llmScore: number | null;
  matchedSignals: string[];
  concerns: string[];
  consentDeclineReason: string | null;
  consentDeclineNotes: string | null;
  connectorDeclineReason: string | null;
  connectorDeclinedAt: string | null;
  consentRespondedAt: string | null;
  matchedAt: string;
  isClaimedByOther?: boolean;
  linkedUploadJob?: InboxLinkedUploadJob | null;
  resumeFileName?: string | null;
  gapAnalysis?:
    | import("@/lib/recruitment/gap-analysis.types").GapAnalysisPayload
    | null;
}

export interface InboxUploadJob {
  type: "upload_job";
  uploadJobId: string;
  fileName: string;
  status: "queued" | "processing" | "failed";
  failureReason: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export type InboxItem = InboxCandidate | InboxUploadJob;

export interface InboxJobFields {
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  jobLocation: string | null;
  bountyAmount: string;
  jobDescription: string;
  jobRequiredSkills: string[] | null;
  jobPreferredSkills: string[] | null;
  jobSalaryRangeMin: string;
  jobSalaryRangeMax: string;
  jobSalaryCurrency: string | null;
  jobSalaryPeriod: string | null;
  jobSalaryRangeNotes: string | null;
  jobPostedAt: string;
  myReferCount?: number;
  hasSharedLink?: boolean;
  connectorPayout?: string;
  sharerPayout?: string;
}

// Inbox is now a jobs-only list — candidate detail loads lazily in the board.
export interface InboxJob extends InboxJobFields {
  candidateCount: number;
}

// Closed jobs still carry their candidates inline (unchanged flow).
export interface ClosedInboxJob extends InboxJobFields {
  closedAt: string;
  closedReason: string | null;
  candidates: InboxItem[];
}

export type JobPoolPagination = {
  page: number;
  limit: number;
  totalJobs: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} | null;
