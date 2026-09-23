import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { Dispute, IntroductionForDispute } from "@/types/dispute";
import {
  detectIntroductionIssues,
  canFileDispute,
  type DetectedIssue,
} from "@/utils/disputeDetection";
import { toast, useToast } from "@/hooks/use-toast";
import { AnyType } from "@/types/common";
import { useState } from "react";
import { QUERY_KEYS } from "@/constants/api";

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useDisputes(
  introductionRequestId?: string,
  search?: string,
  status?: string,
  priority?: string,
  options?: { enabled?: boolean }
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [eligibleSearch, setEligibleSearch] = useState("");
  const [eligiblePage, setEligiblePage] = useState(1);
  const [eligibleLimit, setEligibleLimit] = useState(10);

  // Build query params object
  const queryParams: Record<string, unknown> = { page, limit };
  if (introductionRequestId) {
    queryParams.introductionRequestId = introductionRequestId;
  }
  if (search && search !== "") {
    queryParams.search = search;
  }
  if (status && status !== "all") {
    queryParams.status = status;
  }
  if (priority && priority !== "all") {
    queryParams.priority = priority;
  }

  // Build eligible query params
  const eligibleQueryParams: Record<string, unknown> = {
    page: eligiblePage,
    limit: eligibleLimit,
    search: eligibleSearch,
  };

  // Fetch all disputes (filtered by introductionRequestId if provided)
  const {
    data: disputesData,
    isLoading: loadingDisputes,
    refetch: refetchDisputes,
    error: disputesError,
  } = useQuery<{
    data: Dispute[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: [QUERY_KEYS.DISPUTES, queryParams],
    enabled: options?.enabled,
  });

  const disputes = disputesData?.data || [];
  const pagination: PaginationInfo = {
    page: disputesData?.page || page,
    limit: disputesData?.limit || limit,
    total: disputesData?.total || 0,
    totalPages: disputesData?.totalPages || 0,
  };

  // Fetch eligible introductions for filing a dispute
  const {
    data: eligibleData,
    isLoading: loadingEligible,
    refetch: refetchEligible,
    error: eligibleError,
  } = useQuery<{
    data: IntroductionForDispute[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: [QUERY_KEYS.ELIGIBLE_INTRODUCTIONS, eligibleQueryParams],
    enabled: options?.enabled,
  });

  const eligibleIntroductions = eligibleData?.data || [];
  const eligiblePagination: PaginationInfo = {
    page: eligibleData?.page || eligiblePage,
    limit: eligibleData?.limit || eligibleLimit,
    total: eligibleData?.total || 0,
    totalPages: eligibleData?.totalPages || 0,
  };

  // Create dispute mutation
  const createDisputeMutation = useMutation({
    mutationFn: async (disputeData: Partial<Dispute>) => {
      return apiRequest("/disputes", {
        method: "POST",
        body: JSON.stringify(disputeData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Dispute filed successfully",
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DISPUTES] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ELIGIBLE_INTRODUCTIONS],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to file dispute",
        variant: "destructive",
      });
    },
  });

  // Helper functions for specific introduction request
  /**
   * Checks if there's an active dispute for the given request ID.
   * NOTE: This only checks within the currently fetched page of disputes.
   * For a definitive check across all disputes, please use a server-side check.
   */
  const hasActiveDispute = (requestId: string) => {
    return disputes.some(
      (d) =>
        d.introductionRequestId === requestId &&
        (d.status === "pending" || d.status === "under_review")
    );
  };

  // Detect potential issues for an introduction
  const detectIssues = (introduction: AnyType): DetectedIssue | null => {
    return detectIntroductionIssues({
      id: introduction.id,
      stage: introduction.stage,
      status: introduction.status,
      meetingDate: introduction.meetingDate || introduction.meeting_date,
      lastActivity: introduction.lastActivity || introduction.last_activity,
      bountyAmount: introduction.bountyAmount || introduction.bounty_amount,
      agreedBountyAmount:
        introduction.agreedBountyAmount || introduction.agreed_bounty_amount,
      paymentStatus: introduction.paymentStatus || introduction.payment_status,
      payoutStatus: introduction.payoutStatus || introduction.payout_status,
      paidAt: introduction.paidAt || introduction.paid_at,
      paidOutAt: introduction.paidOutAt || introduction.paid_out_at,
      createdAt: introduction.createdAt || introduction.created_at,
    });
  };

  // Check if can file dispute for an introduction
  const checkCanFileDispute = (introduction: AnyType): boolean => {
    return canFileDispute({
      id: introduction.id,
      stage: introduction.stage,
      status: introduction.status,
      meetingDate: introduction.meetingDate || introduction.meeting_date,
      lastActivity: introduction.lastActivity || introduction.last_activity,
      bountyAmount: introduction.bountyAmount || introduction.bounty_amount,
    });
  };

  return {
    disputes,
    eligibleIntroductions,
    loading: loadingDisputes || loadingEligible,
    disputesError,
    eligibleError,
    createDispute: createDisputeMutation.mutateAsync,
    isCreating: createDisputeMutation.isPending,
    refetchDisputes,
    refetchEligible,
    hasActiveDispute,
    detectIssues,
    checkCanFileDispute,
    pagination,
    setPage,
    setLimit,
    eligibleSearch,
    setEligibleSearch,
    eligiblePage,
    setEligiblePage,
    eligibleLimit,
    setEligibleLimit,
    eligiblePagination,
  };
}
