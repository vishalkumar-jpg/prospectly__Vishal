import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export type PipelineType =
  | "requester"
  | "connector"
  | "recruiter"
  | "my_pipeline";

interface UserFilter {
  requester?: string[] | null;
  connector?: string[] | null;
  recruiter?: string[] | null;
  my_pipeline?: string[] | null;
}

interface UserConfiguration {
  userFilter?: UserFilter | null;
}

const CONFIG_QUERY_KEY = ["/api/profiles/me/configuration"];

function toStages(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function readUserFilter(config: UserConfiguration | undefined): UserFilter {
  const filter = config?.userFilter;
  if (!filter || typeof filter !== "object") return {};
  return filter;
}

export function usePipelineFilterConfig(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const enabled = options?.enabled !== false;

  const {
    data: config,
    isLoading,
    error,
  } = useQuery<UserConfiguration>({
    queryKey: CONFIG_QUERY_KEY,
    queryFn: () => api.profiles.getConfiguration(),
    enabled,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
  });

  const saveMutation = useMutation({
    mutationFn: ({
      pipelineType,
      stages,
    }: {
      pipelineType: PipelineType;
      stages: string[];
    }) =>
      api.profiles.updateConfiguration({
        userFilter: { [pipelineType]: stages },
      }),
    onSuccess: (data: UserConfiguration) => {
      queryClient.setQueryData(CONFIG_QUERY_KEY, data);
    },
    onError: (error) => {
      toast({
        title: "Failed to save filter",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const savePipelineFilter = (pipelineType: PipelineType, stages: string[]) => {
    return saveMutation.mutateAsync({ pipelineType, stages });
  };

  const userFilter = readUserFilter(config);

  return {
    // Keep flat accessors so pipeline screens stay unchanged.
    requesterPipelineFilterStages: toStages(userFilter.requester),
    connectorPipelineFilterStages: toStages(userFilter.connector),
    recruiterPipelineFilterStages: toStages(userFilter.recruiter),
    myPipelineFilterStages: toStages(userFilter.my_pipeline),
    savePipelineFilter,
    isLoading,
    error,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    isSaveError: saveMutation.isError,
  };
}
