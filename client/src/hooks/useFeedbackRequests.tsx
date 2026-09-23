import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AnyType } from "@/types/common";
import type { FeedbackMedia, FeedbackRequest } from "@/types/system-feedback";

export type {
  FeedbackMedia,
  FeedbackMediaItem,
  FeedbackRequest,
} from "@/types/system-feedback";

export const SYSTEM_FEEDBACK_ME_QUERY_KEY = ["system-feedback", "me"] as const;

function getSystemFeedbackMeQueryKey(userId?: number) {
  return [...SYSTEM_FEEDBACK_ME_QUERY_KEY, userId] as const;
}

function toFeedbackErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Failed to fetch feedback";
}

export function useFeedbackRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = getSystemFeedbackMeQueryKey(user?.id);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const items = await api.systemFeedback.listMine();
      return Array.isArray(items) ? items : [];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (feedbackData: {
      type: FeedbackRequest["type"];
      priority: FeedbackRequest["priority"];
      title: string;
      description: string;
      current_page?: string;
      media?: FeedbackMedia[];
    }) => {
      if (!user) throw new Error("User not authenticated");

      const response: AnyType = await api.systemFeedback.create({
        type: feedbackData.type,
        priority: feedbackData.priority,
        title: feedbackData.title,
        description: feedbackData.description,
        currentPage: feedbackData.current_page,
        media: feedbackData.media,
      });

      return (response.data ?? response) as FeedbackRequest;
    },
    onSuccess: (newFeedback) => {
      queryClient.setQueryData<FeedbackRequest[]>(queryKey, (prev) => [
        newFeedback,
        ...(prev ?? []),
      ]);
    },
  });

  const createFeedback = async (feedbackData: {
    type: FeedbackRequest["type"];
    priority: FeedbackRequest["priority"];
    title: string;
    description: string;
    current_page?: string;
    media?: FeedbackMedia[];
  }) => {
    try {
      return await createMutation.mutateAsync(feedbackData);
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "Failed to create feedback"
      );
    }
  };

  return {
    feedback: query.data ?? [],
    loading: query.isLoading,
    submitting: createMutation.isPending,
    error: query.error ? toFeedbackErrorMessage(query.error) : null,
    createFeedback,
    refetch: query.refetch,
  };
}
