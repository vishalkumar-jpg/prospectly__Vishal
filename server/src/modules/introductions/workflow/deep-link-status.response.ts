export const DEEP_LINK_STATUS = {
  // Common
  NOT_FOUND: "not_found",
  // Review (connector inbox)
  ALREADY_ACCEPTED: "already_accepted",
  ACCEPTED_BY_YOU: "accepted_by_you",
  AVAILABLE: "available",
  UNAVAILABLE: "unavailable",
  // Acknowledge (requester pipeline)
  ALREADY_ACKNOWLEDGED: "already_acknowledged",
  READY: "ready",
  NOT_READY: "not_ready",
  // Feedback (connector pipeline)
  ALREADY_FEEDBACK_GIVEN: "already_feedback_given",
  FEEDBACK_READY: "feedback_ready",
  FEEDBACK_NOT_READY: "feedback_not_ready",
} as const;

export type DeepLinkAction = "review" | "acknowledge" | "feedback";

export type DeepLinkStatus =
  (typeof DEEP_LINK_STATUS)[keyof typeof DEEP_LINK_STATUS];

export type DeepLinkStatusResponse = {
  status: DeepLinkStatus;
};
