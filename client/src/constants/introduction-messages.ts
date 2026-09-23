export const INTRODUCTION_MESSAGES = {
  requestAlreadyAccepted: {
    title: "Request Already Accepted",
    description:
      "This introduction request has already been accepted by another connector. No further action is required.",
  },
  requestAcceptedByYou: {
    title: "Request Already Accepted",
    description:
      "You have already accepted this introduction request. No further action is required.",
  },
  requestNotFoundInbox: {
    title: "Request not found",
    description:
      "This introduction request could not be found in your inbox.",
  },
  requestNotFoundPipeline: {
    title: "Request not found",
    description:
      "This introduction request could not be found in your pipeline.",
  },
  meetingAlreadyAcknowledged: {
    title: "Meeting Already Acknowledged",
    description:
      "You have already confirmed that this meeting took place. No further action is required.",
  },
  meetingNotReadyForAcknowledge: {
    title: "Cannot acknowledge meeting",
    description:
      "This meeting has not been marked complete yet. You can acknowledge it once the meeting is finished.",
  },
  feedbackAlreadyGiven: {
    title: "Feedback Already Submitted",
    description:
      "You have already submitted feedback for this introduction. No further action is required.",
  },
  feedbackNotReady: {
    title: "Cannot submit feedback yet",
    description:
      "This introduction has not reached the feedback stage yet. You can submit feedback once the meeting is completed.",
  },
  privateConnectorsExhausted: {
    title: "Private connectors exhausted",
    description:
      "All private connectors marked this request unsuccessful. Re-publish isn't available — you can move it to the global marketplace.",
  },
  republishUnavailable: {
    title: "Re-publish unavailable",
    description:
      "This request cannot be re-published right now. Check your pipeline for available actions.",
  },
} as const;

/** Mirrors server error strings used for API error matching (not user-facing toast copy). */
export const INTRODUCTION_API_ERRORS = {
  alreadyAcceptedByAnotherConnector:
    "This introduction request has already been accepted by another connector",
} as const;

export type DeepLinkAction =
  | "review"
  | "acknowledge"
  | "feedback"
  | "republish"
  | "marketplace";

export type DeepLinkStatus =
  | "not_found"
  | "already_accepted"
  | "accepted_by_you"
  | "available"
  | "unavailable"
  | "already_acknowledged"
  | "ready"
  | "not_ready"
  | "already_feedback_given"
  | "feedback_ready"
  | "feedback_not_ready";
