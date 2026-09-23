import { useQuery } from "@tanstack/react-query";

export interface TransactionParty {
  id: string;
  fullName: string | null;
  email: string | null;
}

export interface Transaction {
  requestId: string;
  contactName: string;
  meetingTitle: string | null;
  bountyAmount: number;
  requesterDisplayAmount?: number;
  status: string;
  createdAt: string;
  connector: TransactionParty | null;
  remainingPaymentStatus: string | null;
  // Role and payment fields used by TransactionHistory UI
  role?: "requester" | "connector";
  paymentStatus?: string | null;
  initialPaymentStatus?: string | null;
  payoutReleased?: boolean;
  payoutStatus?: string | null;
  payoutError?: string | null;
  connectorPayoutAmount?: number;
  // Refund-related fields
  isRefunded?: boolean;
  overallStatus?: string | null;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface TransactionHistoryResponse {
  transactions: Transaction[];
  summary: {
    totalDebits: number;
    totalCredits: number;
    totalPlatformFees: number;
    pendingPayouts: number;
    completedPayouts: number;
    transactionCount: number;
  };
  pagination: PaginationMeta;
}

export type DatePreset =
  | "all"
  | "last7days"
  | "last30days"
  | "last3months"
  | "lastyear"
  | "custom";

export interface TransactionFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: "all" | "pending" | "completed";
  sortBy?: "date" | "amount" | "contact";
  sortOrder?: "asc" | "desc";
  datePreset?: DatePreset;
  startDate?: string;
  endDate?: string;
}

export function useTransactionHistory(filters: TransactionFilters = {}) {
  const {
    page = 1,
    limit = 10,
    search = "",
    status = "all",
    sortBy = "date",
    sortOrder = "desc",
    datePreset = "all",
    startDate,
    endDate,
  } = filters;

  // Use default queryFn which automatically handles token refresh
  // Query parameters are passed in queryKey and will be converted to query string by apiRequestForQuery
  const { data, isLoading, isFetching, error, refetch } =
    useQuery<TransactionHistoryResponse>({
      queryKey: [
        "/api/finances/transactions",
        {
          page,
          limit,
          search,
          status,
          sortBy,
          sortOrder,
          datePreset,
          startDate,
          endDate,
        },
      ],
      // Default queryFn from queryClient will handle the request with automatic token refresh
      staleTime: 30 * 1000,
      placeholderData: (previousData) => previousData,
    });

  return {
    transactions: data?.transactions || [],
    summary: data?.summary || {
      totalDebits: 0,
      totalCredits: 0,
      totalPlatformFees: 0,
      pendingPayouts: 0,
      completedPayouts: 0,
      transactionCount: 0,
    },
    pagination: data?.pagination || {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    loading: isLoading,
    isFetching,
    error,
    refetch,
  };
}

export interface WorkflowStep {
  step: string;
  label: string;
  description: string;
  status: "completed" | "current" | "pending" | "skipped";
  completedAt: string | null;
  actionNeeded: string | null;
}

export interface PayoutRecord {
  requestId: string;
  contactName: string;
  meetingTitle: string | null;
  requester: TransactionParty | null;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  payoutStatus: string;
  payoutReleased: boolean;
  payoutReleasedAt: string | null;
  payoutTriggeredBy?: string | null;
  currentTrustScore?: number | null;
  qualifiesForImmediatePayout?: boolean;
  createdAt?: string;
  workflowProgress?: WorkflowStep[];
  // Credit system fields
  creditsApplied?: number;
  commissionAfterCredits?: number;
  creditsRemainingAfter?: number;
}

export interface PayoutPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PayoutHistoryResponse {
  payouts: PayoutRecord[];
  summary: {
    totalGrossEarnings: number;
    totalPlatformFees: number;
    totalNetEarnings: number;
    pendingPayouts: number;
    completedPayouts: number;
    payoutCount: number;
    averagePayoutAmount: number;
    stripeRecipientAccountId: string | null;
    stripeRecipientOnboardingComplete: boolean;
  };
  pagination: PayoutPagination;
}

export interface PayoutHistoryFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  datePreset?: DatePreset;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

export function usePayoutHistory(filters: PayoutHistoryFilters = {}) {
  const {
    page = 1,
    limit = 10,
    status = "all",
    search = "",
    datePreset = "all",
    startDate,
    endDate,
    enabled,
  } = filters;

  // Use default queryFn which automatically handles token refresh
  // Query parameters are passed in queryKey and will be converted to query string by apiRequestForQuery
  const { data, isLoading, error, refetch } = useQuery<PayoutHistoryResponse>({
    queryKey: [
      "/api/finances/payouts",
      { page, limit, status, search, datePreset, startDate, endDate },
    ],
    // Default queryFn from queryClient will handle the request with automatic token refresh
    staleTime: 30 * 1000,
    enabled,
  });

  return {
    payouts: data?.payouts || [],
    summary: data?.summary || {
      totalGrossEarnings: 0,
      totalPlatformFees: 0,
      totalNetEarnings: 0,
      pendingPayouts: 0,
      completedPayouts: 0,
      payoutCount: 0,
      averagePayoutAmount: 0,
      stripeRecipientAccountId: null,
      stripeRecipientOnboardingComplete: false,
    },
    pagination: data?.pagination || {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    loading: isLoading,
    error,
    refetch,
  };
}

export interface PaymentEvent {
  type: string;
  timestamp: string | null;
  amount: number | null;
  status: string | null;
  stripeId: string | null;
  description: string;
  transactionId?: string;
}

export interface UnsuccessfulAttempt {
  markedAt: string;
  failureReason: string;
  failureStage: string;
}

export interface PaymentCycle {
  transactionId: string;
  cycleNumber: number;
  isActive: boolean;
  authorizedAt: string | null;
}

export interface RefundInfo {
  stageId: string;
  stageName: string;
  refundAmount: number;
  refundStatus: string;
  refundReason: string | null;
  refundedAt: string | null;
  stripeRefundId: string | null;
}

export interface RequestTransactionDetails {
  requestId: string;
  contactName: string;
  status: string;
  createdAt: string;
  userRole: "requester" | "connector";
  bountyAmount: number;
  providerFee?: number;
  processingFee?: number;
  requesterTotalAmount?: number;
  initialChargeAmount: number;
  initialChargePercentage: number;
  remainingChargeAmount: number;
  remainingChargePercentage: number;
  platformCommissionAmount: number;
  platformCommissionPercentage: number;
  connectorPayoutAmount: number;
  connectorPayoutPercentage: number;
  paymentEvents: PaymentEvent[];
  paymentStatus: string | null;
  payoutStatus?: string | null;
  payoutReleased?: boolean;
  payoutReleasedAt?: string | null;
  payoutTriggeredBy?: string | null;
  connectorTrustScoreAtPayout?: number | null;
  payoutError?: string | null;
  initialChargeReceiptUrl: string | null;
  remainingChargeReceiptUrl: string | null;
  // Refund-related fields
  isRefunded: boolean;
  totalRefundedAmount: number;
  refunds: RefundInfo[];
  initialRefundAmount?: number | null;
  remainingRefundAmount?: number | null;
  initialChargeStatus: string | null;
  remainingChargeStatus: string | null;
  unsuccessfulAttempts: UnsuccessfulAttempt[];
  paymentCycles: PaymentCycle[];
}

export function useRequestTransactionDetails(requestId: string) {
  const { data, isLoading, error, refetch } =
    useQuery<RequestTransactionDetails>({
      queryKey: [`/api/finances/requests/${requestId}/transactions`],
      enabled: !!requestId,
      staleTime: 30 * 1000,
      // Uses default queryFn from queryClient which already extracts data
    });

  return {
    details: data,
    loading: isLoading,
    error,
    refetch,
  };
}
