import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

export function getGettingStartedProgressQueryKey(userId: string | number) {
  return ["/api/auth/getting-started/progress", userId] as const;
}

export function useGettingStartedProgress() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey:
      userId != null
        ? getGettingStartedProgressQueryKey(userId)
        : (["/api/auth/getting-started/progress", "pending"] as const),
    queryFn: () => api.gettingStarted.getProgress(),
    enabled: userId != null,
  });
}
