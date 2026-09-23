export const REFUND_STATUS = {
  REFUND_INITIATED: "refund_initiated",
  REFUNDED: "refunded",
  REFUND_FAILED: "refund_failed",
} as const;

export const PAYMENT_STAGE_STATUS = {
  AUTHORIZED: "authorized",
  CAPTURED: "captured",
  REFUND_INITIATED: "refund_initiated",
  REFUNDED: "refunded",
  REFUND_FAILED: "refund_failed",
  VOIDED: "voided",
} as const;

export const REFUND_INITIATOR = {
  CONNECTOR: "connector",
  ADMIN: "admin",
  REQUESTER: "requester",
} as const;

export const FAILURE_REASONS = {
  NO_RESPONSE: "no_response",
  PROSPECT_DECLINED: "prospect_declined",
  SCHEDULING_ISSUES: "scheduling_issues",
  NO_SHOW: "no_show",
  INVALID_EMAIL: "invalid_email",
  OTHER: "other",
} as const;

export const FAILURE_STAGES = {
  INTRO_SENT: "intro_sent",
  MEETING_BOOKED: "meeting_booked",
} as const;

export const PAYMENT_STAGE_NAMES = {
  INTRO_EMAIL_SENT: "intro_email_sent",
  MEETING_BOOKED: "meeting_booked",
} as const;

export const REFUNDS_MESSAGES = {
  ERROR: {
    NOT_ACCEPTED_CONNECTOR:
      "Only the connector who accepted this request can mark it as unfulfilled",
    INVALID_STAGE:
      "Request can only be marked unfulfilled from intro_sent or meeting_booked stages",
    ALREADY_UNFULFILLED: "This request has already been marked as unfulfilled",
    REFUND_ALREADY_PROCESSED:
      "Refund has already been processed for this payment stage",
    PAYMENT_NOT_CAPTURED:
      "Cannot refund - payment was not captured for this stage",
    TRANSACTION_NOT_FOUND:
      "Transaction not found for this introduction request",
    PAYMENT_STAGE_NOT_FOUND: "Payment stage not found",
    REFUND_FAILED: (error: string) => `Refund failed: ${error}`,
    CANCEL_INTENT_FAILED: (error: string) =>
      `Failed to cancel payment intent: ${error}`,
  },
  SUCCESS: {
    MARKED_UNFULFILLED:
      "Introduction request marked as unfulfilled. Refund initiated.",
    REFUND_PROCESSED: "Refund processed successfully",
  },
  LOG: {
    PROCESSING_REFUND: (requestId: string, stage: string) =>
      `Processing refund for request ${requestId} at stage ${stage}`,
    REFUND_CREATED: (refundId: string, amount: number) =>
      `Refund created: ${refundId}, amount: $${amount}`,
    INTENT_CANCELLED: (intentId: string) =>
      `Payment intent cancelled: ${intentId}`,
    FULFILLMENT_ATTEMPT_RECORDED: (requestId: string, connectorId: string) =>
      `Fulfillment attempt recorded for request ${requestId} by connector ${connectorId}`,
  },
};

export type FailureReason =
  (typeof FAILURE_REASONS)[keyof typeof FAILURE_REASONS];
export type FailureStage = (typeof FAILURE_STAGES)[keyof typeof FAILURE_STAGES];
export type RefundStatus = (typeof REFUND_STATUS)[keyof typeof REFUND_STATUS];
export type RefundInitiator =
  (typeof REFUND_INITIATOR)[keyof typeof REFUND_INITIATOR];
export type PaymentStageStatus =
  (typeof PAYMENT_STAGE_STATUS)[keyof typeof PAYMENT_STAGE_STATUS];
