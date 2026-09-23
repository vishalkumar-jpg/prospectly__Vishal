/**
 * Recruitment Spending API Module
 *
 * Handles requester spending endpoints for recruitment transactions.
 */

import { request } from "./core";

/** Recruiter-spending transaction types: the interview/referral charge, the
 * one-time flat referral deposit, the post-hire flat fee top-up, the candidate
 * success fee, and the success-fee top-up. */
export type SpendingTransactionType =
  | "interview_cost"
  | "flat_deposit"
  | "flat_topup"
  | "success_fee"
  | "success_fee_topup";

export interface SpendingTransaction {
  id: string;
  totalAmount: string;
  status: string;
  /** Discriminator — "flat_deposit" is the one-time flat referral deposit. */
  transactionType: SpendingTransactionType;
  createdAt: string;
}

export interface SpendingCandidateGroup {
  candidateId: string;
  candidateLabel: string;
  candidateEmail: string | null;
  totalAmount: string;
  transactions: SpendingTransaction[];
}

export interface SpendingJobGroup {
  jobId: string;
  jobTitle: string;
  companyName: string;
  totalAmount: string;
  candidates: SpendingCandidateGroup[];
}

export interface SpendingListResponse {
  jobs: SpendingJobGroup[];
  pagination: {
    page: number;
    limit: number;
    /** Number of matching jobs, not transaction rows. */
    total: number;
    totalPages: number;
  };
}

export interface SpendingStatsResponse {
  totalSpent: number;
  upcomingPayments: number;
  spentThisMonth: number;
}

export interface SpendingBreakdown {
  bountyAmount: string;
  providerFee: string;
  processingFee: string;
  totalAmount: string;
}

export interface SpendingTimelineEvent {
  event: string;
  date: string | null;
}

export interface SpendingDetailResponse {
  id: string;
  jobTitle: string;
  companyName: string;
  candidateLabel: string;
  candidateEmail: string | null;
  totalAmount: string;
  status: string;
  transactionType: SpendingTransactionType;
  createdAt: string;
  authorizedAt: string | null;
  capturedAt: string | null;
  cancelledAt: string | null;
  chargeAmount: string | null;
  receiptUrl: string | null;
  paymentError: string | null;
  breakdown: SpendingBreakdown | null;
  timeline: SpendingTimelineEvent[];
}

export const recruitmentSpendingApi = {
  getDetail: (id: string) =>
    request<SpendingDetailResponse>(`/recruitment/spending/${id}`),
};
