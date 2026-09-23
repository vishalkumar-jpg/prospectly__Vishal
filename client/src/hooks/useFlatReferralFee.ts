import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { FlatReferralFeeResponse } from "@/lib/api/recruitment";
import { useDebouncedValue } from "./useDebouncedValue";
import { isCentPrecise } from "@/lib/formatted-decimal";

interface UseFlatReferralFeeParams {
  /** Recruiter-entered flat referral fee. Debounced internally. */
  flatAmount: number;
  /** When false, skips the request (e.g. in read-only/edit views). */
  enabled?: boolean;
}

const FLAT_FEE_DEBOUNCE_MS = 400;

/**
 * Live fee preview for the Flat Referral Model. All values are computed by the
 * server (which also reads the admin publish %); the client only sends the
 * recruiter-entered flat amount and renders the returned breakdown.
 */
export function useFlatReferralFee({
  flatAmount,
  enabled = true,
}: UseFlatReferralFeeParams) {
  const debouncedAmount = useDebouncedValue(flatAmount, FLAT_FEE_DEBOUNCE_MS);

  // Only send a positive, cent-precise amount — the endpoint rejects anything
  // finer than two decimals, so skipping here avoids a guaranteed 400.
  const amountValid =
    typeof debouncedAmount === "number" &&
    isCentPrecise(debouncedAmount) &&
    debouncedAmount > 0;

  const { data, isLoading, isFetching } = useQuery<FlatReferralFeeResponse>({
    queryKey: [
      "/api/recruitment/interview-cost/flat-referral/calculate",
      debouncedAmount,
    ],
    queryFn: () =>
      api.recruitment.getFlatReferralFee({ flatFee: debouncedAmount }),
    enabled: enabled && amountValid,
    staleTime: 5 * 60 * 1000,
    retry: false,
    placeholderData: keepPreviousData,
  });

  const inTransit =
    flatAmount !== debouncedAmount || (isFetching && !isLoading);

  return {
    stripeFee: data?.stripeFee ?? null,
    applicationFee: data?.applicationFee ?? null,
    total: data?.total ?? null,
    loading: isLoading && enabled && amountValid,
    recalculating: enabled && amountValid && inTransit,
  };
}
