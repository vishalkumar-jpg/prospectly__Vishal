/**
 * Response contracts for the Candidate Bonus endpoints.
 *
 * Numeric amounts are returned as strings (pass-through from Drizzle's
 * `numeric` columns) — the frontend parses them with `Number(...)` when
 * formatting. These rows are always self-scoped (recipient = the candidate),
 * so the anonymized candidate label used on the connector tab is irrelevant
 * here.
 */

export type CandidateBonusProcessingStatus =
  | "pending"
  | "queued"
  | "onboarding_pending"
  | "processing"
  | "completed"
  | "failed"
  | "manual_review";

export type CandidateBonusPayoutStatus =
  | "pending"
  | "completed"
  | "cancelled"
  | "failed";

export interface CandidateBonusListItem {
  id: string;
  jobTitle: string;
  companyName: string;
  /** recipientAmount — the net bonus the candidate receives. */
  earnedAmount: string | null;
  /** Queue processing status — drives the badge unless the row is cancelled. */
  processingStatus: CandidateBonusProcessingStatus;
  /** Payout lifecycle status — `cancelled` overrides the badge in the UI. */
  payoutStatus: CandidateBonusPayoutStatus;
  createdAt: string;
}

export interface CandidateBonusListResponse {
  bonuses: CandidateBonusListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CandidateBonusTimelineEvent {
  event: string;
  date: string | null;
}

export interface CandidateBonusDetailResponse extends CandidateBonusListItem {
  timeline: CandidateBonusTimelineEvent[];
  /**
   * Candidate-friendly label mapped from the internal cancellation reason
   * code (the raw code is never returned). Null unless the bonus was cancelled.
   */
  cancellationReasonLabel: string | null;
  /** Recruiter's free-text cancellation notes, shown verbatim. */
  cancellationNotes: string | null;
  /** When the bonus was cancelled (updatedAt of the cancel write); null otherwise. */
  cancelledAt: string | null;
}
