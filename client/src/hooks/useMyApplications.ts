import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MyApplicationItem } from "@/lib/api/recruitment";

const MY_APPLICATIONS_KEY = "/api/recruitment/my-applications";
const POLL_INTERVAL_MS = 2000;

/** True while any application is still AI-analyzing (drives auto-refetch). */
function isAnalyzing(applications: MyApplicationItem[]): boolean {
  return applications.some(
    (app) => app.status === "processing" || app.analysisStatus === "pending"
  );
}

export function useMyApplications() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [MY_APPLICATIONS_KEY],
    queryFn: () => api.recruitment.getMyApplications({ limit: 50, page: 1 }),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchInterval: (query) => {
      const applications = query.state.data?.applications ?? [];
      return isAnalyzing(applications) ? POLL_INTERVAL_MS : false;
    },
  });

  return {
    applications: data?.applications ?? [],
    pagination: data?.pagination ?? null,
    loading: isLoading,
    isFetching,
    error,
    refetch,
  };
}
