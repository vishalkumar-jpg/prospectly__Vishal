import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type {
  ConsentApplyPayload,
  DeclineConsentPayload,
} from "@/lib/api/recruitment";

const JOB_POOL_MATCHES_KEY = "/api/recruitment/job-pool-matches";

export function useSendConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) => api.recruitment.sendConsent(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [JOB_POOL_MATCHES_KEY] });
    },
  });
}

export function useResendConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) => api.recruitment.resendConsent(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [JOB_POOL_MATCHES_KEY] });
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/connector-pipeline"],
      });
    },
  });
}

export function useConsentEmailForEdit(matchId: string | null) {
  return useQuery({
    queryKey: ["/api/recruitment/consent", matchId, "consent-email"],
    queryFn: () => api.recruitment.getConsentEmail(matchId!),
    enabled: !!matchId,
    retry: false,
    staleTime: 0,
  });
}

export function useUpdateConsentEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { matchId: string; email: string }) =>
      api.recruitment.updateConsentEmail(payload.matchId, payload.email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [JOB_POOL_MATCHES_KEY] });
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/connector-pipeline"],
      });
    },
  });
}

export function useVerifyConsent(token: string | undefined) {
  return useQuery({
    queryKey: ["/api/recruitment/consent/verify", token],
    queryFn: () => api.recruitment.verifyConsentToken(token!),
    enabled: !!token,
    retry: false,
    staleTime: 30000,
  });
}

export function useDeclineConsent() {
  return useMutation({
    mutationFn: (payload: DeclineConsentPayload) =>
      api.recruitment.declineConsent(payload),
  });
}

export function useConsentApply() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  return useMutation({
    mutationFn: (payload: ConsentApplyPayload) =>
      api.recruitment.consentApply(payload),
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/my-applications"],
      });

      // Consent-apply persists the payout country, so both copies of it the
      // completion gate reads are now stale.
      queryClient.invalidateQueries({ queryKey: ["profile-completion"] });
      await refreshUser();
    },
  });
}
