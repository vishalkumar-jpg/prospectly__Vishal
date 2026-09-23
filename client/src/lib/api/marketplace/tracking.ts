/**
 * Marketplace Tracking API Module
 * Handles tracking-related endpoints
 */

import { request } from "@/lib/api/core";

interface TrackingWorkflowStep {
  step: string;
  label: string;
  description: string;
  status: "completed" | "current" | "pending" | "skipped";
  completedAt: string | null;
  actionNeeded: string | null;
}

interface SharerTrackingDetailsResponse {
  workflowProgress: TrackingWorkflowStep[];
  currentTrustScore: number | null;
  qualifiesForImmediatePayout: boolean;
}

export const trackingApi = {
  getSharerTrackingDetails: (requestId: string) =>
    request<SharerTrackingDetailsResponse>(
      `/marketplace/my-shares/requests/${requestId}/tracking`
    ),
};
