/**
 * Marketplace Claims API Module
 * Handles claim-related endpoints
 */

import { request } from "../core";

export const claimsApi = {
  startClaim: (data: {
    requestId: string;
    sharerCode: string;
    captchaToken?: string;
  }) =>
    request<{
      claimId: string;
      status: string;
      message: string;
    }>("/marketplace/claim/start", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verifyClaim: (data: { claimId: string; prospectContactId?: number }) =>
    request<{
      verified: boolean;
      claimId: string;
      status: string;
      claimerShare?: number;
      sharerShare?: number;
      message: string;
      failureReason?: string;
    }>("/marketplace/claim/verify", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  completeClaim: (claimId: string) =>
    request<{
      claimId: string;
      status: string;
      message: string;
    }>("/marketplace/claim/complete", {
      method: "POST",
      body: JSON.stringify({ claimId }),
    }),

  getClaimStatus: (claimId: string) =>
    request<{
      id: string;
      status: "pending" | "verifying" | "verified" | "completed" | "failed";
      failureReason?: string;
      claimerShare?: number;
      sharerShare?: number;
      verificationCompletedAt?: string;
      verificationTriggeredAt?: string;
      claimedAt?: string;
    }>(`/marketplace/claim/${claimId}/status`),

  getMyClaims: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    const query = searchParams.toString();
    return request<{
      claims: Array<{
        id: string;
        status: string;
        claimerShare: number;
        sharerShare: number;
        claimedAt: string | null;
        createdAt: string;
        failureReason?: string;
        verificationTriggeredAt?: string | null;
        request: {
          id: string;
          contactName: string;
          contactCompany: string;
          bountyAmount: number;
          meetingTitle: string;
        };
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/marketplace/my-claims${query ? `?${query}` : ""}`);
  },

  getSharerClaims: () =>
    request<
      Array<{
        claimId: string;
        introductionRequestId: string;
        claimerId: string;
        status: string;
        claimerShare: number | null;
        sharerShare: number | null;
        createdAt: string;
        verificationCompletedAt: string | null;
        claimedAt: string | null;
        contactName: string;
        bountyAmount: number;
        requestStatus: string;
        requesterArchiveReason?: string | null;
        requesterArchiveNotes?: string | null;
        requesterArchivedAt?: string | null;
      }>
    >("/marketplace/my-shares/claims"),

  getShareClaimsForShare: (shareId: string) =>
    request<
      Array<{
        claimId: string;
        status: string;
        claimerShare: number | null;
        sharerShare: number | null;
        createdAt: string;
        claimedAt: string | null;
      }>
    >(`/marketplace/my-shares/${shareId}/claims`),
};
