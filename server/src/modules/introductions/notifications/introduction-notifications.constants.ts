export const INTRODUCTION_NOTIFICATION_QUEUE_NAME = "introduction-notification";

export const INTRODUCTION_NOTIFICATION_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: {
      age: 7 * 24 * 60 * 60,
      count: 500,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
    },
  },
};

export const INTRODUCTION_NOTIFICATION_QUEUE_JOBS = {
  SEND_LIFECYCLE: "send-lifecycle",
} as const;

export const INTRODUCTION_NOTIFICATION_TYPE = {
  CONNECTOR_REQUEST_RAISED: "connector_request_raised",
  REQUESTER_CONNECTOR_ACCEPTED: "requester_connector_accepted",
  REQUESTER_INTRO_SENT: "requester_intro_sent",
  REQUESTER_MEETING_ACK: "requester_meeting_ack",
  FEEDBACK_REQUEST: "feedback_request",
  SHARER_REQUEST_CLAIMED: "sharer_request_claimed",
  REQUESTER_REQUEST_UNSUCCESSFUL: "requester_request_unsuccessful",
} as const;

export type IntroductionNotificationType =
  (typeof INTRODUCTION_NOTIFICATION_TYPE)[keyof typeof INTRODUCTION_NOTIFICATION_TYPE];

export const INTRODUCTION_NOTIFICATION_DB_PAGE_SIZE = 1000;
export const INTRODUCTION_NOTIFICATION_EMAIL_BATCH_SIZE = 100;
export const INTRODUCTION_NOTIFICATION_BATCH_DELAY_MS = 3000;

export const buildIntroductionNotificationJobId = (
  requestId: string,
  type: IntroductionNotificationType
): string => `intro-${requestId}-${type}`;

export const buildConnectorRequestRaisedJobId = (
  requestId: string,
  cycleNumber = 0
): string =>
  `intro-${requestId}-${INTRODUCTION_NOTIFICATION_TYPE.CONNECTOR_REQUEST_RAISED}-cycle-${cycleNumber}`;

export const buildRequesterRequestUnsuccessfulJobId = (
  requestId: string,
  attemptNumber = 1
): string =>
  `intro-${requestId}-${INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_REQUEST_UNSUCCESSFUL}-attempt-${attemptNumber}`;

export const buildSharerClaimNotificationJobId = (claimId: string): string =>
  `intro-claim-${claimId}-sharer_request_claimed`;
