import { useQuery, type RefetchOptions } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";

export type ImportStatus = "pending" | "processing" | "completed" | "failed";

export interface ContactSourceStatus {
  source: "Google" | "Microsoft" | "Apple" | "LinkedIn";
  isActive: boolean;
  contactCount: number;
  importStatus: ImportStatus | null;
  imported: number;
  failed: number;
  duplicates: number;
  totalFetched: number;
  importStartedAt: Date | null;
  importCompletedAt: Date | null;
  importErrorMessage: string | null;
  latestImport?: {
    id: string;
    status: ImportStatus;
    imported: number;
    failed: number;
    duplicates: number;
    totalFetched: number;
    errorMessage?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
    createdAt: string;
  };
  provider?: string;
}

export function useContactSourceStatus() {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery<ContactSourceStatus[]>({
    queryKey: ["/contact-source-status"],
    queryFn: async () => {
      const response = await apiRequest("/contact-source-status");

      // Extract data from the new response format { data, status }
      const responseData = response?.data ?? response;

      // Ensure we get an array
      return Array.isArray(responseData) ? responseData : [];
    },
    enabled: !!user, // Only fetch when user is available
    staleTime: 0, // Always consider data stale to ensure fresh data on mount
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Prevent refetch on window focus to reduce unnecessary calls
  });

  return {
    sourceStatuses: data ?? [],
    loading: isLoading,
    error:
      error instanceof Error ? error : error ? new Error(String(error)) : null,
    refreshSourceStatuses: (options?: RefetchOptions) => refetch(options),
  };
}
