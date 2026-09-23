import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Searchable list of organisations (with active-member counts) for the notify selector. */
export function useOrganisations(search: string) {
  const trimmed = search.trim();
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/recruitment/organisations", { search: trimmed }],
    queryFn: () =>
      api.recruitment.getOrganisations({
        search: trimmed || undefined,
        limit: 50,
      }),
    staleTime: 60 * 1000,
  });

  return {
    organisations: data?.organisations ?? [],
    loading: isLoading,
    error,
  };
}

/** Recipient-count preview for the confirm modal. Enabled only when orgs are selected. */
export function useNotifyPreview(jobId: string | undefined, orgIds: string[]) {
  const enabled = !!jobId && orgIds.length > 0;
  const { data, isFetching, error } = useQuery({
    queryKey: ["/api/recruitment/notify-preview", jobId, [...orgIds].sort()],
    queryFn: () => api.recruitment.getNotifyPreview(jobId!, orgIds),
    enabled,
    staleTime: 30 * 1000,
  });

  return {
    recipientCount: data?.recipientCount ?? null,
    loading: isFetching,
    error,
  };
}

export function useSendJobNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      jobId,
      organisationIds,
    }: {
      jobId: string;
      organisationIds: string[];
    }) => api.recruitment.sendJobNotification(jobId, organisationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/jobs"],
      });
    },
  });
}
