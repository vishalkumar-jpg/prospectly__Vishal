import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Industry,
  Department,
  RecruitmentStage,
} from "@/lib/api/recruitment";

export function useIndustries(search?: string) {
  const normalizedSearch = search?.trim() || undefined;
  const { data, isLoading, error, refetch } = useQuery<Industry[]>({
    queryKey: ["/api/recruitment/master-data/industries", normalizedSearch],
    queryFn: () => api.recruitment.getIndustries(normalizedSearch),
    staleTime: normalizedSearch ? 0 : 10 * 60 * 1000,
  });

  return { industries: data ?? [], loading: isLoading, error, refetch };
}

export function useDepartments(search?: string) {
  const normalizedSearch = search?.trim() || undefined;
  const { data, isLoading, error, refetch } = useQuery<Department[]>({
    queryKey: ["/api/recruitment/master-data/departments", normalizedSearch],
    queryFn: () => api.recruitment.getDepartments(normalizedSearch),
    staleTime: normalizedSearch ? 0 : 10 * 60 * 1000,
  });

  return { departments: data ?? [], loading: isLoading, error, refetch };
}

export function useRecruitmentStages(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;

  const { data, isLoading, error } = useQuery<RecruitmentStage[]>({
    queryKey: ["/api/recruitment/master-data/recruitment-stages"],
    queryFn: () => api.recruitment.getRecruitmentStages(),
    enabled,
    staleTime: 30 * 60 * 1000,
    refetchOnMount: "always",
  });

  return { stages: data ?? [], loading: isLoading, error };
}
