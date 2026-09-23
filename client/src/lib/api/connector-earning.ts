/**
 * Connector Earning API Module
 *
 * Handles connector payout endpoints backed by `recruitment_payout_history`.
 * Mirrors the shape of `recruitment-spending.ts` so the two recruitment
 * finance tabs stay symmetric.
 */

import { request } from "./core";

export type ConnectorEarningProcessingStatus =
  | "pending"
  | "queued"
  | "onboarding_pending"
  | "processing"
  | "completed"
  | "failed"
  | "manual_review";

/**
 * Client-safe failure reason. The server NEVER sends the raw error_message
 * (which can contain Stripe internals); it maps to one of these enum values,
 * which the UI renders as friendly copy.
 */
export type SafePayoutFailureReason =
  | "transfer_failed"
  | "recipient_setup_incomplete"
  | "needs_review";

export interface ConnectorEarning {
  id: string;
  jobTitle: string;
  companyName: string;
  candidateLabel: string;
  /** commissionAfterCredits as a numeric string, or null if not set yet. */
  earnedAmount: string | null;
  /** credits deducted from this payout; "0" when none applied. */
  creditsApplied: string;
  processingStatus: ConnectorEarningProcessingStatus;
  /** true when the payout is split across multiple connectors. */
  isShared: boolean;
  createdAt: string;
}

export interface ConnectorEarningPayoutItem {
  id: string;
  earnedAmount: string | null;
  creditsApplied: string;
  processingStatus: ConnectorEarningProcessingStatus;
  isShared: boolean;
  createdAt: string;
}

export interface ConnectorEarningCandidateGroup {
  candidateId: string;
  candidateLabel: string;
  totalAmount: string;
  earnings: ConnectorEarningPayoutItem[];
}

export interface ConnectorEarningJobGroup {
  jobId: string;
  jobTitle: string;
  companyName: string;
  totalAmount: string;
  candidates: ConnectorEarningCandidateGroup[];
}

export interface ConnectorEarningListResponse {
  jobs: ConnectorEarningJobGroup[];
  pagination: {
    page: number;
    limit: number;
    /** Number of matching jobs, not payout rows. */
    total: number;
    totalPages: number;
  };
}

export interface ConnectorEarningStatsResponse {
  totalEarnings: number;
  totalEarningsThisMonth: number;
  totalEarningsLastMonth: number;
  pendingPayouts: number;
}

export interface ConnectorEarningBreakdown {
  /** Full connector pool pre-split. Populated only for shared earnings. */
  originalAmount: string | null;
  /** This connector's share after split. Null for solo earnings. */
  yourShareAmount: string | null;
  creditsApplied: string;
  creditsRemainingAfter: string;
}

export interface ConnectorEarningTimelineEvent {
  event: string;
  date: string | null;
}

export interface ConnectorEarningDetailResponse extends ConnectorEarning {
  breakdown: ConnectorEarningBreakdown;
  timeline: ConnectorEarningTimelineEvent[];
  /** Client-safe failure reason; null unless the row failed/needs review. */
  failureReason: SafePayoutFailureReason | null;
  retryCount: number;
  role: string | null;
  sharePercent: string | null;
}

export const connectorEarningApi = {
  getDetail: (id: string) =>
    request<ConnectorEarningDetailResponse>(`/recruitment/earning/${id}`),
};
