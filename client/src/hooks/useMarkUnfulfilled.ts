import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

interface MarkUnfulfilledParams {
  requestId: string;
  failureReason: string;
  failureNotes?: string;
}

interface MarkUnfulfilledResponse {
  success: boolean;
  message: string;
  refundDetails?: {
    success: boolean;
    refundedStages: Array<{
      stageName: string;
      stripeRefundId: string;
      refundAmount: number;
      refundStatus: string;
    }>;
    cancelledIntents: string[];
    totalRefundedAmount: number;
  };
}

export function useMarkUnfulfilled() {
  const queryClient = useQueryClient();

  return useMutation<MarkUnfulfilledResponse, Error, MarkUnfulfilledParams>({
    mutationFn: async ({ requestId, failureReason, failureNotes }) => {
      return apiRequest<MarkUnfulfilledResponse>(
        `/introduction-requests/${requestId}/mark-unfulfilled`,
        {
          method: "POST",
          body: JSON.stringify({ failureReason, failureNotes }),
        }
      );
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({
        queryKey: ["/api/introduction-requests/connector/pipeline"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/introduction-requests/introduction-pipeline/stats"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/introduction-requests/introduction-pipeline/archive"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/introduction-requests/connector/unfulfilled"],
      });
    },
  });
}
