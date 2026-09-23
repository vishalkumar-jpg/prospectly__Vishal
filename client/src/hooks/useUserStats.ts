import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface UserStats {
  trustPoints: number;
  connections: number;
  introductions: number;
  activeBounties: number;
}

export function useUserStats() {
  const { data, isLoading, error, refetch } = useQuery<UserStats>({
    queryKey: ["/api/profiles/me/stats"],
    queryFn: async () => {
      return api.profiles.stats();
    },
    staleTime: 0, // Always consider data stale to ensure fresh data on mount
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Always refetch when component mounts
  });

  return {
    trustPoints: data?.trustPoints ?? 0,
    connections: data?.connections ?? 0,
    introductions: data?.introductions ?? 0,
    activeBounties: data?.activeBounties ?? 0,
    loading: isLoading,
    error,
    refetch,
  };
}
