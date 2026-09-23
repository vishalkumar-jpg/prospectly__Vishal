export type MetricDirection = "up" | "down" | "flat";

export type MetricWithChange = {
  value: number;
  changePct: number | null;
  direction: MetricDirection;
};

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
  amount: string;
  currency: string;
  releaseDate: string;
  daysUntilRelease: number;
  dueStatus: PayoutDueStatus;
  isFailed: boolean;
};

export type RecruiterPayoutsDueResponse = {
  totalCount: number;
  overdueCount: number;
  dueTodayCount: number;
  items: PayoutDueItem[];
};

export type RecruiterCandidateFunnelResponse = {
  applied: number;
  screened: number;
  interviewed: number;
  hired: number;
  rejected: number;
};

export const DASHBOARD_PERIOD_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
] as const;

export type DashboardPeriodValue =
  (typeof DASHBOARD_PERIOD_OPTIONS)[number]["value"];
