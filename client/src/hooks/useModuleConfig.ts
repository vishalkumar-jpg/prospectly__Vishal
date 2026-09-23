import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

export function getModuleConfigQueryKey(userId: string | number) {
  return ["/api/module-access/config", userId] as const;
}

/** Resolved recruiting-module config for the current user's organisation. */
export function useModuleConfig() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey:
      userId != null
        ? getModuleConfigQueryKey(userId)
        : (["/api/module-access/config", "pending"] as const),
    queryFn: () => api.moduleAccess.getConfig(),
    enabled: userId != null,
  });
}
