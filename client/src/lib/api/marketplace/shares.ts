/**
 * Marketplace Shares API Module
 * Handles share-related endpoints
 */

import { request } from "../core";

export const sharesApi = {
  shareRequest: (data: { introductionRequestId: string; platform?: string }) =>
    request<{
      id: string;
      sharerCode: string;
      shareUrl: string;
    }>("/marketplace/share", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMyShares: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    const query = searchParams.toString();
    return request<{
      shares: Array<{
        id: string;
        sharerCode: string;
        introductionRequestId: string;
        platform: string;
        createdAt: string;
        clicksCount: number;
        request: {
          id: string;
          contactName: string;
          bountyAmount: number;
          meetingTitle: string;
        };
        // Contact details from contacts table
        contactTitle: string | null;
        contactCompany: string | null;
        contactLinkedin: string | null;
        contactWebsite: string | null;
        contactProfilePhotoUrl: string | null;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/marketplace/my-shares${query ? `?${query}` : ""}`);
  },

  /* Unused API function - commented out
  getShareAnalytics: (shareId: string) =>
    request<{
      views: number;
      clicks: number;
      signupAttempts: number;
      claims: number;
      completedClaims: number;
    }>(`/marketplace/my-shares/${shareId}/analytics`),
  */
};
