import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface UpcomingMeeting {
  id: string;
  title: string | null;
  description: string;
  meetingDate: string;
  meetingLink: string | null;
  requesterName: string | null;
  requesterPhotoUrl: string | null;
  bountyAmount: number;
  prospectName: string | null;
  prospectPhotoUrl: string | null;
  isRequester: boolean;
}

export function useUpcomingMeetings(enabled: boolean = false) {
  const { data, isLoading, error, refetch } = useQuery<{
    meetings: UpcomingMeeting[];
  }>({
    queryKey: ["/api/dashboard/upcoming-meetings"],
    queryFn: () => api.dashboard.upcomingMeetings(),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  return {
    meetings: data?.meetings || [],
    loading: isLoading,
    error,
    refetch,
  };
}
