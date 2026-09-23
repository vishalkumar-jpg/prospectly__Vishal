import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Organizations selectable in the profile-completion gate. Unlike the
 * recruitment list this includes organizations pending approval, so a user can
 * find one another user added before an admin reviewed it.
 */
export function useCompletionOrganisations(search: string, enabled = true) {
  const trimmed = search.trim();

  const { data, isLoading, error } = useQuery({
    queryKey: ["profile-completion-organizations", { search: trimmed }],
    queryFn: () =>
      api.profiles.getCompletionOrganizations({
        search: trimmed || undefined,
      }),
    enabled,
    staleTime: 60 * 1000,
  });

  return {
    organisations: data?.organizations ?? [],
    total: data?.pagination.total ?? 0,
    loading: isLoading,
    error,
  };
}
