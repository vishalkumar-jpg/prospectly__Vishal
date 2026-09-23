import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import type { ConnectorOriginForMeResponse } from "@/lib/api/recruitment";

// Reads the marketplace-split origin row for the currently signed-in user.
// Returns hasOrigin=false when the user signed up without a ref (or never
// clicked "I Have a Candidate"). Used by the dashboard to decide whether
// to fire the post-welcome popup.
export function useConnectorOrigin() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery<ConnectorOriginForMeResponse>({
    queryKey: ["/api/recruitment/connector-origins/me"],
    enabled: !!user, // never hit the endpoint while signed out
    staleTime: 5 * 60 * 1000,
    retry: 0, // best-effort; missing origin must not block onboarding
  });

  return {
    origin: data ?? null,
    isLoading,
    error,
  };
}
