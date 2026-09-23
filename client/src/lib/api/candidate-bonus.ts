/**
 * Candidate Bonus API Module
 *
 * A hired candidate's own success-fee payouts, backed by
 * `recruitment_payout_history` (payoutType = 'candidate'). Mirrors the shape
 * of `connector-earning.ts` so the recruitment finance tabs stay symmetric,
 * minus the connector-only split/credit fields.
 */

import { request } from "./core";

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

export interface CandidateBonus {
  id: string;
  jobTitle: string;
  companyName: string;
  /** recipientAmount as a numeric string, or null if not set yet. */
  earnedAmount: string | null;
  processingStatus: CandidateBonusProcessingStatus;
  /** `cancelled` overrides the processing badge in the UI. */
  payoutStatus: CandidateBonusPayoutStatus;
  createdAt: string;
}

export interface CandidateBonusListResponse {
  bonuses: CandidateBonus[];
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

export interface CandidateBonusDetailResponse extends CandidateBonus {
  timeline: CandidateBonusTimelineEvent[];
  cancellationReasonLabel: string | null;
  cancellationNotes: string | null;
  cancelledAt: string | null;
}

export interface CandidateBonusListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  datePreset?: string;
  startDate?: string;
  endDate?: string;
}

export const candidateBonusApi = {
  getList: (params: CandidateBonusListParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        qs.set(key, String(value));
      }
    });
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<CandidateBonusListResponse>(
      `/recruitment/candidate-bonus${suffix}`
    );
  },
  getDetail: (id: string) =>
    request<CandidateBonusDetailResponse>(`/recruitment/candidate-bonus/${id}`),
};
