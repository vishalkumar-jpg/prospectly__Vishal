import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { IntroductionPaymentFeesResponse } from "@/lib/api/introductions";
import { useDebouncedValue } from "./useDebouncedValue";

const BOUNTY_DEBOUNCE_MS = 400;

export function useIntroductionPaymentFees(bountyAmount: number | string) {
  const numericBounty =
    typeof bountyAmount === "string"
      ? parseFloat(bountyAmount)
      : bountyAmount;
  const debouncedBounty = useDebouncedValue(numericBounty, BOUNTY_DEBOUNCE_MS);
  const bountyValid =
    Number.isFinite(debouncedBounty) &&
    Number.isInteger(debouncedBounty) &&
    debouncedBounty >= 10;

  const { data, isLoading, isFetching } = useQuery<IntroductionPaymentFeesResponse>(
    {
      queryKey: [
        "/api/introduction-requests/calculate-payment-fees",
        debouncedBounty,
      ],
      queryFn: () => api.introductions.calculatePaymentFees(debouncedBounty),
      enabled: bountyValid,
      staleTime: 5 * 60 * 1000,
      retry: false,
      placeholderData: keepPreviousData,
    }
  );

  const recalculating =
    numericBounty !== debouncedBounty || (isFetching && !isLoading);

  return {
    bountyAmount: data?.bountyAmount ?? null,
    providerFee: data?.providerFee ?? null,
    processingFee: data?.processingFee ?? null,
    totalAmount: data?.totalAmount ?? null,
    initialChargeAmount: data?.initialChargeAmount ?? null,
    remainingChargeAmount: data?.remainingChargeAmount ?? null,
    loading: isLoading && bountyValid,
    recalculating: bountyValid && recalculating,
  };
}
