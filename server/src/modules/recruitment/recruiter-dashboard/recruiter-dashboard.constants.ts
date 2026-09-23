import type { RecruitmentStageKey } from "../recruitment-stage-keys.constants";

export const RECRUITER_DASHBOARD_MESSAGES = {
  FETCH_SUMMARY_FAILED: "Failed to fetch recruiting dashboard summary",
  FETCH_OVERVIEW_FAILED: "Failed to fetch hiring overview",
  FETCH_FUNNEL_FAILED: "Failed to fetch candidate funnel",
  FETCH_PAYOUTS_DUE_FAILED: "Failed to fetch payouts due",
} as const;

/** Payouts whose release date falls within this many days (or earlier) are "due". */
export const PAYOUTS_DUE_WINDOW_DAYS = 7;

export const DASHBOARD_PERIODS = ["7", "30", "90", "ytd", "all"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];
export const DEFAULT_DASHBOARD_PERIOD: DashboardPeriod = "30";

export const DASHBOARD_LIMITS = {
  PRIORITY_ACTIONS: 5,
  ACTIVE_JOBS: 5,
  RECENT_ACTIVITY: 6,
  // The card lists every due payout in a fixed-height scroll; this only caps
  // the payload.
  PAYOUTS_DUE: 50,
} as const;

export const PRIORITY_ACTION_TYPES = {
  NEW_APPLICATIONS: "new_applications",
  SHORTLISTED_PENDING: "shortlisted_pending",
  INTERVIEW_INVITE_PENDING: "interview_invite_pending",
  INTERVIEW_SCHEDULED: "interview_scheduled",
  INTERVIEW_FEEDBACK: "interview_feedback",
  DRAFT_READY: "draft_ready",
} as const;

export const FUNNEL_SCREENED_STAGES = [
  "shortlisted",
  "interview_invite_sent",
  "interview_scheduled",
  "interview_completed",
  "hired",
] as const satisfies readonly RecruitmentStageKey[];

export const FUNNEL_INTERVIEWED_STAGES = [
  "interview_scheduled",
  "interview_completed",
  "hired",
] as const satisfies readonly RecruitmentStageKey[];

export const ACTIVITY_INTERVIEW_SCHEDULED_STAGE =
  "interview_scheduled" as const satisfies RecruitmentStageKey;
export const ACTIVITY_HIRED_STAGE =
  "hired" as const satisfies RecruitmentStageKey;
export const ACTIVITY_STAGE_KEYS = [
  ACTIVITY_INTERVIEW_SCHEDULED_STAGE,
  ACTIVITY_HIRED_STAGE,
] as const;
