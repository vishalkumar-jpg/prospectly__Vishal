import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export type CalendarProvider = "google" | "microsoft";

export interface CalendarIntegration {
  id: string;
  provider: CalendarProvider;
  providerEmail: string;
  isActive: boolean;
  createdAt: string;
  syncError?: string;
}

export const CALENDAR_INTEGRATIONS_QUERY_KEY = ["calendar", "integrations"];

/**
 * Shared React Query hook for the `/calendar/integrations` endpoint.
 *
 * Centralizing the fetch here means every consumer (calendar status checks,
 * the connect modal, etc.) reads from a single cached query keyed
 * `["calendar", "integrations"]`. React Query de-dupes identical keys, so even
 * when multiple components mount simultaneously only ONE network request fires.
 */
export function useCalendarIntegrations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CALENDAR_INTEGRATIONS_QUERY_KEY,
    queryFn: async () => {
      const res = await api.calendar.listIntegrations();
      return Array.isArray(res) ? res : [];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: CALENDAR_INTEGRATIONS_QUERY_KEY,
    });

  return {
    integrations: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidate,
  };
}
