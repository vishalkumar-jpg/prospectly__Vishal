import { IntroductionStatus } from "../introductions/introductions.constants";

export enum FinancesSortFieldEnum {
  DATE = "date",
  AMOUNT = "amount",
  CONTACT = "contact",
}

export enum FinancesSortOrderEnum {
  ASC = "asc",
  DESC = "desc",
}

export enum TransactionStatusEnum {
  ALL = "all",
  COMPLETED = "completed",
  PENDING = "pending",
  PROCESSING = "processing",
  FAILED = "failed",
  PAID = "paid",
  UNKNOWN = "unknown",
}

export enum DatePresetEnum {
  ALL = "all",
  LAST_7_DAYS = "last7days",
  LAST_30_DAYS = "last30days",
  LAST_3_MONTHS = "last3months",
  LAST_YEAR = "lastyear",
  CUSTOM = "custom",
}

export enum StripePaymentStatusEnum {
  CAPTURED = "captured",
  SUCCEEDED = "succeeded",
}

export enum WorkflowStepEnum {
  INTRO_EMAIL = "intro_email",
  MEETING_BOOKED = "meeting_booked",
  MEETING_ACKNOWLEDGED = "meeting_acknowledged",
  PEER_FEEDBACK = "peer_feedback",
  TRUST_SCORE_CHECK = "trust_score_check",
  STRIPE_CONNECT_SETUP = "stripe_connect_setup",
  PAYOUT_RELEASED = "payout_released",
}

export enum WorkflowStatusEnum {
  COMPLETED = "completed",
  CURRENT = "current",
  PENDING = "pending",
  SKIPPED = "skipped",
}

export enum FinancesActivityTypeEnum {
  INTRO_COMMISSION = "intro_commission",
  BOUNTY_PAYMENT = "bounty_payment",
  PAYOUT = "payout",
  REFUND = "refund",
}

export enum TimeRangeEnum {
  DAYS_7 = "7d",
  DAYS_30 = "30d",
  DAYS_90 = "90d",
  YEAR_1 = "1y",
  ALL = "all",
}

export enum UserRoleEnum {
  REQUESTER = "requester",
  CONNECTOR = "connector",
  BOTH = "both",
}

export enum PayoutTriggerEnum {
  TRUST_SCORE = "trust_score",
  PEER_FEEDBACK = "peer_feedback",
}

export const INTRO_EMAIL_SENT_CHECK: string[] = [
  IntroductionStatus.INTRO_SENT,
  IntroductionStatus.MEETING_SCHEDULED,
  IntroductionStatus.MEETING_BOOKED,
  IntroductionStatus.MEETING_COMPLETED,
  IntroductionStatus.PEER_FEEDBACK,
  IntroductionStatus.COMPLETED,
];

export const MEETING_BOOKED_CHECK: string[] = [
  IntroductionStatus.MEETING_BOOKED,
  IntroductionStatus.MEETING_COMPLETED,
  IntroductionStatus.PEER_FEEDBACK,
  IntroductionStatus.COMPLETED,
];

export const MEETING_ACKNOWLEDGED_CHECK: string[] = [
  IntroductionStatus.MEETING_COMPLETED,
  IntroductionStatus.PEER_FEEDBACK,
  IntroductionStatus.COMPLETED,
];

export const PAYMENT_EVENT_TYPES = {
  AUTHORIZATION: "authorization",
  REQUESTER_WITHDRAWAL: "requester_withdrawal",
  INITIAL_CAPTURE: "initial_capture",
  REMAINING_CAPTURE: "remaining_capture",
  TRANSFER: "transfer",
  PAYOUT: "payout",
} as const;

export const FINANCES_MESSAGES = {
  INFO: {
    FETCHING_TRANSACTION_HISTORY: (userId: string, query: AnyType) =>
      `Fetching transaction history for user ${userId} with query: ${JSON.stringify(query)}`,
    FETCHING_PAYOUT_HISTORY: (userId: string, query: AnyType) =>
      `Fetching payout history for connector ${userId} with query: ${JSON.stringify(query)}`,
    FETCHING_TRANSACTION_DETAILS: (requestId: string) =>
      `Fetching transaction details for request ${requestId}`,
    FETCHING_PAYOUT_DETAILS: (requestId: string, userId: string) =>
      `Fetching payout details for request ${requestId} for connector ${userId}`,
    FETCHING_FINANCIAL_SUMMARY: (userId: string) =>
      `Fetching financial summary for user ${userId}`,
    FETCHING_REVENUE_CHART: (userId: string, range: string) =>
      `Fetching revenue chart for user ${userId}, range: ${range}`,
    FETCHING_TRANSACTION_BREAKDOWN: (userId: string, range: string) =>
      `Fetching transaction breakdown for user ${userId}, range: ${range}`,
    FETCHING_RECENT_ACTIVITY: (userId: string, limit: number) =>
      `Fetching recent activity (transactions only) for user ${userId}, limit: ${limit}`,
    FETCHING_PAYOUT_TIMELINE: (userId: string) =>
      `Fetching payout timeline for user ${userId}`,
  },
  ERROR: {
    INTRO_REQUEST_NOT_FOUND: "Introduction request not found",
    NO_ACCESS_TO_REQUEST: "You do not have access to this request",
    NO_ACCESS_TO_PAYOUT: "You do not have access to this payout",
  },
};

export const FINANCES_DESCRIPTIONS = {
  PAYMENT_AUTHORIZED: "Payment authorized (100% held)",
  REQUESTER_WITHDRAWAL: "Introduction withdrawn by requester.",
  INITIAL_CAPTURE_DONE: "5% captured after intro email delivered",
  INITIAL_CAPTURE_PENDING: "5% pending (awaiting email delivery)",
  INITIAL_CAPTURE_RELEASED:
    "5% authorization released (introduction withdrawn or cancelled)",
  REMAINING_CAPTURE_DONE: "95% captured after meeting scheduled",
  REMAINING_CAPTURE_PENDING: "95% pending (awaiting meeting booking)",
  REFUND_MILESTONE_DESCRIPTION: (amount: number) =>
    `Refund of $${amount.toFixed(2)} (referral portion; processing fees are non-refundable)`,
  BANK_PAYOUT_INITIATED: "Bank payout initiated",
  INTRO_EMAIL_SENT_LABEL: "Introduction Email Sent",
  INTRO_EMAIL_SENT_DESC: "Your introduction email reaches the prospect",
  WAITING_FOR_EMAIL: "Waiting for email delivery",
  MEETING_BOOKED_LABEL: "Meeting Booked",
  MEETING_BOOKED_DESC: "The prospect books a meeting with the requester",
  WAITING_FOR_BOOKING: "Waiting for prospect to book",
  MEETING_COMPLETED_LABEL: "Meeting Completed",
  MEETING_COMPLETED_DESC: "Requester confirms the meeting took place",
  WAITING_FOR_CONFIRMATION: "Waiting for requester confirmation",
  PEER_FEEDBACK_LABEL: "Peer Feedback",
  WAITING_FOR_FEEDBACK: "Waiting for your feedback",
  TRUST_SCORE_VERIFIED_LABEL: "Trust Score Verified",
  STRIPE_CONNECT_SETUP_LABEL: "Connect Bank Account",
  STRIPE_CONNECT_SETUP_DESC: "Connect your bank account to receive payouts",
  PAYOUT_RELEASED_LABEL: "Payout Released",
  PAYOUT_RELEASED_DESC: "Funds transferred to your bank account",
  BOUNTY_FOR: "Referral payout for",
  PAYOUT_FOR: "Payout for",
  TRUST_SCORE_WAS: (score: number) =>
    `Trust score was ${score} - payout released after feedback`,
  TRUST_SCORE_IS: (score: number) =>
    `Trust score is ${score} (requires 8+ for instant payout)`,
  TRUST_SCORE_WAS_INSTANT: (score: number) =>
    `Trust score was ${score} - qualified for instant payout`,
  TRUST_SCORE_QUALIFIES: (score: number) =>
    `Trust score ${score} qualifies for instant payout`,
};
