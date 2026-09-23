import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useMarketplaceFilterOptions() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/marketplace/browse/filters"],
    queryFn: () => api.marketplace.getFilters(),
    staleTime: 5 * 60 * 1000, // 5 minutes - filters don't change often
  });

  return {
    urgencyOptions: data?.urgencyOptions || [],
    bountyRange: data?.bountyRange || { min: 10, max: 10000 },
    sortOptions: data?.sortOptions || [],
    loading: isLoading,
  };
}
