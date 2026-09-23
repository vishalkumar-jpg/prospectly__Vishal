export const FEEDBACK_PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export const FEEDBACK_TYPES = {
  BUG: "bug",
  FEATURE: "feature",
  UI_UX: "ui_ux",
  GENERAL: "general",
} as const;

export const FEEDBACK_STATUSES = {
  NEW: "new",
  UNDER_REVIEW: "under_review",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CLOSED: "closed",
} as const;

export const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  ui_ux: "UI/UX Issue",
  general: "General Feedback",
};

export const FEEDBACK_PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  new: "New",
  under_review: "Under Review",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
};

/** Query params used by feedback emails to deep-link into dashboard UI. */
export const FEEDBACK_EMAIL_QUERY = {
  open: "feedback",
  myFeedback: "myFeedback",
} as const;
