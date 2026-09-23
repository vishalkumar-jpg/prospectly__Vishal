/**
 * Introductions API Module
 * Handles introduction request and potential connector endpoints
 */

import { request } from "./core";
import type {
  DeepLinkAction,
  DeepLinkStatus,
} from "@/constants/introduction-messages";
import type { AnyType } from "@/types/common";

export interface IntroductionPaymentFeesResponse {
  bountyAmount: number;
  providerFee: number;
  processingFee: number;
  totalAmount: number;
  initialChargeAmount: number;
  remainingChargeAmount: number;
}

export const introductionsApi = {
  calculatePaymentFees: (bounty: number) =>
    request<IntroductionPaymentFeesResponse>(
      `/introduction-requests/calculate-payment-fees?bounty=${bounty}`
    ),
  list: () => request<{ requests: AnyType[] }>("/introductions"),

  create: (data: AnyType) =>
    request<{ request: AnyType }>("/introductions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  get: (id: number) => request<{ request: AnyType }>(`/introductions/${id}`),

  accept: (id: string) =>
    request<{ success: boolean; message: string; requestId: string }>(
      `/introduction-requests/${id}/accept`,
      {
        method: "POST",
      }
    ),

  republish: (id: string) =>
    request<{ success: boolean; message: string }>(
      `/introduction-requests/${id}/republish`,
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    ),

  getDeepLinkStatus: (id: string, action: DeepLinkAction) =>
    request<{ status: DeepLinkStatus }>(
      `/introduction-requests/${id}/deep-link-status?action=${action}`
    ),

  updateStage: (id: number, stage: string) =>
    request<{ request: AnyType }>(`/introductions/${id}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    }),

  getEmailLogs: (id: string) =>
    request<AnyType[]>(`/introduction-requests/${id}/email-logs`),

  isRequester: (id: string) =>
    request<{ isRequester: boolean }>(
      `/introduction-requests/${id}/is-requester`
    ),

  acknowledgeCompletion: (id: string) =>
    request<{ success: boolean; message: string; stage: string }>(
      `/introduction-requests/${id}/acknowledge-completion`,
      {
        method: "POST",
      }
    ),

  rescheduleMeeting: (id: string) =>
    request<{ success: boolean; message: string }>(
      `/introduction-requests/${id}/meeting/reschedule`,
      {
        method: "POST",
      }
    ),

  submitFeedback: (
    id: string,
    data: {
      rating: number;
      feedbackText?: string;
      meetingCompleted?: boolean;
      feedbackType: "meeting_feedback" | "peer_feedback";
      existingFeedbackId?: string;
    }
  ) =>
    request<{
      success: boolean;
      message: string;
      feedback: AnyType;
      requesterFeedbackCompleted?: boolean;
      connectorFeedbackCompleted?: boolean;
      payoutTriggered?: boolean;
    }>(`/introduction-requests/${id}/feedback`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getExistingFeedback: (
    id: string,
    feedbackType: "meeting_feedback" | "peer_feedback"
  ) =>
    request<{
      id: string;
      rating: number;
      feedbackText: string;
      meetingCompleted: boolean;
    }>(`/introduction-requests/${id}/feedback?feedbackType=${feedbackType}`),

  sendIntroduction: (
    id: string,
    data: {
      emailSubject: string;
      emailBody: string;
      contactId: string;
      targetContactName: string;
      proposedMeetingDate?: string | null;
      proposedMeetingTime?: string | null;
      meetingDuration?: string;
      meetingPlatform?: string;
    }
  ) =>
    request<{
      success: boolean;
      message: string;
      emailId?: string;
      bookingLink?: string;
    }>(`/introduction-requests/${id}/send-introduction`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  decline: (id: string, reason: string, message?: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/introduction-requests/${id}/decline`, {
      method: "POST",
      body: JSON.stringify({
        declineReason: reason,
        declineMessage: message,
      }),
    }),

  getBountyTransactions: (id: string) =>
    request<{
      transactions: Array<{
        id: string;
        stageId: string;
        amount: number;
        status: string;
        processedAt: string | null;
        paymentIntentId: string | null;
        transferId: string | null;
        bountyStage: {
          title: string;
          description: string;
          icon: string;
          color: string;
          percentage: number;
        } | null;
      }>;
      request: {
        bountyAmount: number;
      } | null;
    }>(`/introduction-requests/${id}/bounty-transactions`),

  checkContactOwnership: (contactId: string) =>
    request<{ isOwned: boolean }>(
      `/introduction-requests/${contactId}/check-ownership`
    ),

  getActiveCount: () =>
    request<{
      current: number;
      limit: number;
      canCreate: boolean;
    }>("/introduction-requests/active-count"),

  inbox: (params?: { search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) {
      qs.set("search", params.search);
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<AnyType[]>(`/introduction-requests/inbox${suffix}`);
  },
};

export const introductionPotentialConnectorsApi = {
  getMyPendingRequests: () =>
    request<{
      count: number;
      entries: AnyType[];
    }>("/introduction-potential-connectors/my-pending-requests"),

  getMyRequests: () =>
    request<{
      count: number;
      requests: AnyType[];
    }>("/introduction-potential-connectors/my-requests"),

  canAcceptRequest: (requestId: string) =>
    request<{
      canAccept: boolean;
    }>(`/introduction-potential-connectors/request/${requestId}/can-accept`),

  acceptRequest: (requestId: string, data: { responderMessage?: string }) =>
    request<{
      message: string;
      requestId: string;
    }>(`/introduction-potential-connectors/request/${requestId}/accept`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  declineRequest: (requestId: string, declineReason: string) =>
    request<{
      message: string;
      entry: AnyType;
    }>(`/introduction-potential-connectors/request/${requestId}/decline`, {
      method: "POST",
      body: JSON.stringify({ declineReason }),
    }),

  getRequestConnectors: (requestId: string) =>
    request<{
      count: number;
      entries: AnyType[];
    }>(`/introduction-potential-connectors/request/${requestId}/connectors`),
};
