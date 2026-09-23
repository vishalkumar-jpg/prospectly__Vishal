/**
 * Response contracts for the Connector Earning endpoints.
 *
 * Numeric amounts are returned as strings (pass-through from Drizzle's
 * `numeric` columns) for list/detail payloads — the frontend parses them
 * with `Number(...)` when formatting. Stats return plain numbers because
 * they are already aggregated via `COALESCE(SUM(...), 0)`.
 */

import { SafePayoutFailureReason } from "modules/recruitment/payout/recruitment-payout.constants";

export type ConnectorEarningProcessingStatus =
  | "pending"
  | "queued"
  | "onboarding_pending"
  | "processing"
  | "completed"
  | "failed"
  | "manual_review";

export interface ConnectorEarningListItem {
  id: string;
  jobTitle: string;
  companyName: string;
  candidateLabel: string;
  /** commissionAfterCredits — the actual amount the connector receives. */
  earnedAmount: string | null;
  /** credits deducted from gross for this payout; 0 when no credits applied. */
  creditsApplied: string;
  processingStatus: ConnectorEarningProcessingStatus;
  /** is_marketplace_deal OR candidate has non-primary connector row. */
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
  /**
   * Full connector pool pre-split (gross × CONNECTOR_PERCENT). Populated only
   * for shared earnings — what this connector would have earned alone.
   */
  originalAmount: string | null;
  /** This connector's share of the pool after split. Null for solo earnings. */
  yourShareAmount: string | null;
  creditsApplied: string;
  creditsRemainingAfter: string;
}

export interface ConnectorEarningTimelineEvent {
  event: string;
  date: string | null;
}

export interface ConnectorEarningDetailResponse extends ConnectorEarningListItem {
  breakdown: ConnectorEarningBreakdown;
  timeline: ConnectorEarningTimelineEvent[];
  // Client-safe failure reason. NEVER the raw error_message column (it can
  // contain Stripe internals / raw exception text). Null unless the row is in a
  // failed / manual_review / onboarding_pending state.
  failureReason: SafePayoutFailureReason | null;
  retryCount: number;
  /** 'primary' | 'claimer' | 'sharer' — from recruitment_candidate_connectors. */
  role: string | null;
  /** the user's share percent on this candidate; null if no connector row. */
  sharePercent: string | null;
}
