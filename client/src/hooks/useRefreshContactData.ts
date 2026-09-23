import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getGettingStartedProgressQueryKey } from "@/hooks/useGettingStartedProgress";
import { ALL_IMPORT_ACCOUNTS_QUERY_KEYS } from "@/lib/contact-import-query-keys";

interface RefreshContactDataOptions {
  refreshSourceStatuses: (opts?: {
    throwOnError?: boolean;
  }) => Promise<unknown> | unknown;
}

export function useRefreshContactData({
  refreshSourceStatuses,
}: RefreshContactDataOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await refreshSourceStatuses({ throwOnError: true });
      await Promise.all(
        ALL_IMPORT_ACCOUNTS_QUERY_KEYS.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey })
        )
      );
      await queryClient.invalidateQueries({
        queryKey: ["/api/trust-score/me/rules"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["/api/credits/rules"],
      });
      if (user?.id != null) {
        await queryClient.invalidateQueries({
          queryKey: getGettingStartedProgressQueryKey(user.id),
        });
      }
      toast({
        title: "Refreshed",
        description: "Data has been updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: error instanceof Error ? error.message : "Refresh failed",
      });
    } finally {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  }, [queryClient, refreshSourceStatuses, toast, user?.id]);

  return {
    refresh,
    isRefreshing,
    isLoading: isRefreshing,
  };
}
