import type { MetricWithChange } from "./utils/recruiter-dashboard-metrics.utils";

export type PriorityActionItem = {
  jobId: string;
  jobTitle: string;
  type:
    | "new_applications"
    | "shortlisted_pending"
    | "interview_invite_pending"
    | "interview_scheduled"
    | "interview_feedback"
    | "draft_ready";
  count: number;
  message: string;
};

export type ActiveJobItem = {
  id: string;
  title: string;
  applicationCount: number;
  status: "active" | "draft";
  daysOpen: number;
};

export type RecentActivityItem = {
  id: string;
  type: "applied" | "interview_scheduled" | "referred" | "hired";
  message: string;
  timestamp: string;
};

export type RecruiterDashboardSummaryResponse = {
  priorityActions: {
    waitingCount: number;
    items: PriorityActionItem[];
  };
  activeJobs: ActiveJobItem[];
  recentActivity: RecentActivityItem[];
};

export type RecruiterHiringOverviewResponse = {
  openRoles: MetricWithChange;
  closedRoles: MetricWithChange;
  totalCandidates: MetricWithChange;
  avgTimeToFillDays: MetricWithChange & { targetDays: number };
};

export type PayoutDueStatus = "overdue" | "due_today" | "upcoming";

export type PayoutDueItem = {
  payoutId: string;
  candidateId: string;
  jobId: string;
  jobTitle: string;
  payoutType: "connector" | "candidate";
  recipientName: string;
  candidateName: string;
  /** Latest amount the recipient will receive (re-priced like the Release dialog). */
  amount: string;
  currency: string;
  /** UTC release date (hire date + waiting/probation period). */
  releaseDate: string;
  /** Calendar days (UTC) from today to releaseDate; negative when overdue. */
  daysUntilRelease: number;
  dueStatus: PayoutDueStatus;
  /** A previous transfer failed — the recruiter needs to retry it. */
  isFailed: boolean;
};

export type RecruiterPayoutsDueResponse = {
  totalCount: number;
  overdueCount: number;
  dueTodayCount: number;
  /** Most urgent first; capped at DASHBOARD_LIMITS.PAYOUTS_DUE. */
  items: PayoutDueItem[];
};

export type RecruiterCandidateFunnelResponse = {
  applied: number;
  screened: number;
  interviewed: number;
  hired: number;
  rejected: number;
};
