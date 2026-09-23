export interface SpendingTransactionItem {
  id: string;
  totalAmount: string;
  status: string;
  transactionType: string;
  createdAt: string;
}

export interface SpendingCandidateGroup {
  candidateId: string;
  candidateLabel: string;
  candidateEmail: string | null;
  totalAmount: string;
  transactions: SpendingTransactionItem[];
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
  transactionType: string;
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
