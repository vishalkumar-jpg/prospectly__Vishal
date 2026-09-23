import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  VERIFICATION_STATUS,
  type VerificationStatus,
} from "@/constants/claim-verification.constants";
import type { ImportSource } from "@/types/verification.types";

export type { VerificationStatus, ImportSource };

export interface ClaimVerificationData {
  id: string;
  status: VerificationStatus;
  sourcesChecked: ImportSource[];
  prospectName: string | null;
  prospectCompany: string | null;
  prospectTitle: string | null;
  bountyAmount: number | null;
  claimerShare: number | null;
  matchedContactId: number | null;
  matchedSource: ImportSource | null;
  createdAt: string;
  resolvedAt: string | null;
}

export function useClaimVerification() {
  const {
    data: verification,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["claim-verification-status"],
    queryFn: () => api.marketplace.getVerificationStatus(),
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: (query) => {
      const data = query.state.data;
      if (
        data &&
        (data.status === VERIFICATION_STATUS.PENDING ||
          data.status === VERIFICATION_STATUS.IN_PROGRESS)
      ) {
        return 10000;
      }
      return false;
    },
  });

  const hasActiveVerification =
    verification &&
    (verification.status === VERIFICATION_STATUS.PENDING ||
      verification.status === VERIFICATION_STATUS.IN_PROGRESS);

  const isVerificationComplete =
    verification &&
    (verification.status === VERIFICATION_STATUS.CLAIMED_COMPLETED ||
      verification.status === VERIFICATION_STATUS.NOT_CLAIMED_FAILED);

  const isVerificationSuccessful =
    verification &&
    verification.status === VERIFICATION_STATUS.CLAIMED_COMPLETED;

  const remainingSources: ImportSource[] = verification
    ? (
        ["linkedin", "google", "microsoft", "apple", "csv"] as ImportSource[]
      ).filter((source) => !verification.sourcesChecked.includes(source))
    : [];

  return {
    verification,
    isLoading,
    error,
    refetch,
    isRefreshing: isRefetching,
    hasActiveVerification,
    isVerificationComplete,
    isVerificationSuccessful,
    remainingSources,
  };
}
