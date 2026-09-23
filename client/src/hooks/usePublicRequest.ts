import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getPublicRequestQueryKey } from "@/lib/public-request-query";

export function usePublicRequest(
  requestId: string | undefined,
  sharerCode: string | undefined
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: getPublicRequestQueryKey(requestId, sharerCode),
    queryFn: () => {
      if (!requestId?.trim() || !sharerCode?.trim()) {
        throw new Error("requestId and sharerCode are required");
      }
      return api.marketplace.getPublicRequest(requestId, sharerCode);
    },
    enabled: !!requestId?.trim() && !!sharerCode?.trim(),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("required")) {
        return false;
      }
      return failureCount < 1;
    },
  });

  return {
    request: data || null,
    loading: isLoading,
    isPending: isLoading,
    isLoading,
    error,
    refetch,
  };
}
