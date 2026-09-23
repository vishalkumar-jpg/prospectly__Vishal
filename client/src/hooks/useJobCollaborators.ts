import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BulkAddCollaboratorsPayload } from "@/lib/api/recruitment";

/** Collaboration roles assignable on a job (module-scoped, owner-only). */
export function useCollaborationRoles(
  jobId: string | undefined,
  enabled = true
) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/recruitment/jobs", jobId, "collaborators/roles"],
    queryFn: () => api.recruitment.getCollaborationRoles(jobId!),
    enabled: !!jobId && enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    roles: data?.roles ?? [],
    loading: isLoading,
    error,
  };
}

/** Active collaborators on a job (owner-only). */
export function useJobCollaborators(jobId: string | undefined, enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/recruitment/jobs", jobId, "collaborators"],
    queryFn: () => api.recruitment.getJobCollaborators(jobId!),
    enabled: !!jobId && enabled,
    staleTime: 30 * 1000,
  });

  return {
    collaborators: data?.collaborators ?? [],
    loading: isLoading,
    error,
    refetch,
  };
}

const ELIGIBLE_PAGE_SIZE = 50;

/**
 * Org members eligible to be added as collaborators — infinite scroll with
 * server-side search. Handles orgs with thousands of members.
 */
export function useEligibleCollaborators(
  jobId: string | undefined,
  search: string,
  enabled = true
) {
  const trimmed = search.trim();
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "/api/recruitment/jobs",
      jobId,
      "collaborators/eligible",
      { search: trimmed },
    ],
    queryFn: ({ pageParam }) =>
      api.recruitment.getEligibleCollaborators(jobId!, {
        search: trimmed || undefined,
        page: pageParam,
        limit: ELIGIBLE_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: !!jobId && enabled,
    staleTime: 30 * 1000,
  });

  return {
    members: data?.pages.flatMap((p) => p.members) ?? [],
    total: data?.pages[0]?.pagination.total ?? 0,
    loading: isLoading,
    error,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
  };
}

export function useBulkAddCollaborators() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      jobId,
      payload,
    }: {
      jobId: string;
      payload: BulkAddCollaboratorsPayload;
    }) => api.recruitment.bulkAddJobCollaborators(jobId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/jobs", variables.jobId, "collaborators"],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "/api/recruitment/jobs",
          variables.jobId,
          "collaborators/eligible",
        ],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recruitment/jobs"] });
    },
  });
}

export function useRemoveCollaborator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      jobId,
      collaboratorUserId,
    }: {
      jobId: string;
      collaboratorUserId: string;
    }) => api.recruitment.removeJobCollaborator(jobId, collaboratorUserId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/jobs", variables.jobId, "collaborators"],
      });
      // The removed user becomes eligible again, so refresh the Add tab list too.
      queryClient.invalidateQueries({
        queryKey: [
          "/api/recruitment/jobs",
          variables.jobId,
          "collaborators/eligible",
        ],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recruitment/jobs"] });
    },
  });
}
