export enum SystemFeedbackStatus {
  NEW = "new",
  UNDER_REVIEW = "under_review",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CLOSED = "closed",
}

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
