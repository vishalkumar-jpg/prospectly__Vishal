import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { invalidateRecruiterDashboardQueries } from "@/pages/recruitment/recruiter-dashboard/hooks/dashboardQuery.utils";
import { toast } from "./use-toast";
import type {
  CloseRecruitmentJobPayload,
  ReopenRecruitmentJobPayload,
  RecruitmentJobDetail,
  RecruitmentJobPipelineDetail,
  UpdateRecruitmentJobPayload,
} from "@/lib/api/recruitment";

type RecruitmentJobQueryData =
  | RecruitmentJobDetail
  | RecruitmentJobPipelineDetail;

/** Shared fields must match `useQuery` so overloads align with the implementation. */
type UseRecruitmentJobResultShared = { loading: boolean } & Pick<
  UseQueryResult<RecruitmentJobQueryData>,
  "error" | "refetch"
>;

interface UseRecruitmentJobsParams {
  status?: string;
  search?: string;
  countries?: string[];
  limit?: number;
}

export function useRecruitmentJobs(params: UseRecruitmentJobsParams = {}) {
  const { status, search, countries, limit = 10 } = params;

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["/api/recruitment/jobs", { status, search, countries, limit }],
    queryFn: ({ pageParam }) =>
      api.recruitment.getJobs({
        status,
        search,
        countries,
        limit,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  const jobs = data?.pages.flatMap((page) => page.jobs) ?? [];
  const totalJobs = data?.pages[0]?.pagination.totalJobs ?? 0;

  return {
    jobs,
    totalJobs,
    loading: isLoading,
    isFetching,
    error,
    refetch,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
  };
}

export function useRecruitmentJob(
  jobId: string | undefined,
  options?: { view?: "full" }
): { job: RecruitmentJobDetail | null } & UseRecruitmentJobResultShared;
export function useRecruitmentJob(
  jobId: string | undefined,
  options: { view: "pipeline" }
): { job: RecruitmentJobPipelineDetail | null } & UseRecruitmentJobResultShared;
export function useRecruitmentJob(
  jobId: string | undefined,
  options?: { view?: "full" | "pipeline" }
): { job: RecruitmentJobQueryData | null } & UseRecruitmentJobResultShared {
  const view = options?.view ?? "full";
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/recruitment/jobs", jobId, { view }],
    queryFn: () =>
      view === "pipeline"
        ? api.recruitment.getJob(jobId!, { view: "pipeline" })
        : api.recruitment.getJob(jobId!),
    enabled: !!jobId,
    staleTime: 30 * 1000,
    refetchOnMount: true,
  });

  return {
    job: data ?? null,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useUpdateRecruitmentJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      jobId,
      payload,
    }: {
      jobId: string;
      payload: UpdateRecruitmentJobPayload;
    }) => api.recruitment.updateJob(jobId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/jobs", variables.jobId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/jobs"],
      });
    },
  });
}

export function useCloseRecruitmentJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      jobId,
      payload,
    }: {
      jobId: string;
      payload: CloseRecruitmentJobPayload;
    }) => api.recruitment.closeJob(jobId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/jobs"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/jobs/stats"],
      });
      void invalidateRecruiterDashboardQueries(queryClient);
    },
  });
}

export function useReopenRecruitmentJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      jobId,
      payload,
    }: {
      jobId: string;
      payload?: ReopenRecruitmentJobPayload;
    }) => api.recruitment.reopenJob(jobId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/jobs"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/jobs/stats"],
      });
      void invalidateRecruiterDashboardQueries(queryClient);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to reopen job",
        description:
          error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
    },
  });
}

export function useRecruitmentJobStats() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/recruitment/jobs/stats"],
    queryFn: () => api.recruitment.getJobStats(),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  return {
    totalJobs: data?.totalJobs ?? 0,
    activeJobs: data?.activeJobs ?? 0,
    closedJobs: data?.closedJobs ?? 0,
    loading: isLoading,
    error,
    refetch,
  };
}
