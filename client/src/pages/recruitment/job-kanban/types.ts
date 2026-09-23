export type RecruiterStage =
  | "in_review"
  | "shortlisted"
  | "interview_invite_sent"
  | "interview_scheduled"
  | "interview_completed"
  | "hired"
  | "rejected"
  | "not_qualified";

export type InterviewOutcome = "completed" | "no_show" | "cancelled";

export const PIPELINE_STAGES = [
  {
    id: "not_qualified" as const,
    label: "Not Qualified",
    color: "bg-slate-400",
    bgColor: "bg-slate-50",
    textColor: "text-slate-600",
  },
  {
    id: "in_review" as const,
    label: "In Review",
    color: "bg-amber-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
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
    label: "Invite Sent",
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
  {
    id: "rejected" as const,
    label: "Rejected",
    color: "bg-slate-400",
    bgColor: "bg-slate-50",
    textColor: "text-slate-600",
  },
] as const;

export interface StageColors {
  /** Solid dot / accent fill */
  color: string;
  /** Soft tint background (legacy header band) */
  bgColor: string;
  /** Accent text */
  textColor: string;
  /** 2px colored bottom border on the column head */
  headBorder: string;
  /** Soft ring around the stage dot */
  dotRing: string;
  /** Count pill background */
  countBg: string;
  /** Count pill text */
  countText: string;
  /** Stage-tinted candidate card avatar */
  avatarTint: string;
}

export const STAGE_COLORS: Record<string, StageColors> = {
  in_review: {
    color: "bg-amber-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    headBorder: "border-amber-500",
    dotRing: "ring-amber-500/15",
    countBg: "bg-amber-100",
    countText: "text-amber-700",
    avatarTint: "bg-amber-50 text-amber-700",
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
};

export interface KanbanCandidate {
  id: string;
  anonymousId: string;
  avatarColor: string;
  currentTitle: string | null;
  currentCompany: string | null;
  /** Whole years from resume; null when unknown */
  experienceYears: number | null;
  skills: string[];
  /** AI match score (0–100); shown on card when present */
  matchScore?: number | null;
  expectedSalary?: number;
  noticePeriodDays?: number;
  availability?: string;
  stage: RecruiterStage;
  stageUpdatedAt: string;
  connectorAnonymousId: string;
  referralType?: "direct" | "public_claim";
  // Revealed after payment captured (interview_scheduled, interview_completed)
  revealedName?: string;
  revealedEmail?: string;
  revealedLinkedIn?: string;
  rejectionReason?: string;
  /** Why the candidate is in Not Qualified (score/screening); shown on the card. */
  notQualifiedReason?: string;
  meetingDate?: string;
  interviewOutcome?: InterviewOutcome;
  /** Drives Edit Classification CTA visibility on the Hired stage. */
  hasPendingConnectorPayouts?: boolean;
  /** Drives Release Payout CTA visibility on the Hired stage. */
  hasPendingCandidatePayout?: boolean;
  /** When true, candidate row is in onboarding_pending — show "Awaiting candidate Stripe Connect setup" badge instead of Release CTA. */
  candidatePayoutOnboardingPending?: boolean;
  /** Any connector payout row exists (any status) — keeps the connector button as a "details" view after release. */
  hasConnectorPayout?: boolean;
  /** Any candidate payout row exists (any status) — keeps the candidate button as a "details" view after release. */
  hasCandidatePayout?: boolean;
  /** A connector payout failed (recoverable) — show "Payout Failed" badge + "Retry Payout". */
  hasFailedConnectorPayout?: boolean;
  /** A candidate payout failed (recoverable) — show "Payout Failed" badge + "Retry Payout". */
  hasFailedCandidatePayout?: boolean;
  /** A connector payout needs manual review (non-recoverable) — badge only, no retry. */
  hasManualReviewConnectorPayout?: boolean;
  /** A candidate payout needs manual review (non-recoverable) — badge only, no retry. */
  hasManualReviewCandidatePayout?: boolean;
  /** Rejected + has a reinstate-eligible history stage — show Move Back CTA. */
  canReinstate?: boolean;
}

export interface JobDetail {
  id: string;
  title: string;
  companyName: string;
  location: string;
  workType: "remote" | "hybrid" | "onsite";
  status: "active" | "paused" | "closed";
  salaryRange: { min: number; max: number; currency: string };
  bountyAmount: number;
  interviewsUsed: number;
  createdAt: string;
  skills: string[];
}
