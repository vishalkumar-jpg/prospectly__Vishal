/**
 * Marketplace API Module
 * Handles marketplace-related endpoints
 */

import type { ImportSource } from "@/types/verification.types";
import { request } from "@/lib/api/core";
import { sharesApi } from "@/lib/api/marketplace/shares";
import { claimsApi } from "@/lib/api/marketplace/claims";
import { trackingApi } from "@/lib/api/marketplace/tracking";

export interface PublicRequestData {
  id: string;
  contactName: string;
  contactTitle: string;
  contactCompany: string;
  meetingTitle: string;
  meetingDescription: string;
  bountyAmount: number;
  claimerShare: number;
  sharerShare: number;
  isUrgent: boolean;
  isClaimed: boolean;
  interestedCount: number;
  viewCount: number;
  createdAt: string | null;
  prospect: {
    name: string | null;
    title: string | null;
    headline: string | null;
    photoUrl: string | null;
    linkedinUrl: string | null;
    location: string | null;
    organization: {
      name: string | null;
      website: string | null;
      logoUrl: string | null;
      industry: string | null;
      description: string | null;
      linkedinUrl: string | null;
    } | null;
  } | null;
}

export const marketplaceApi = {
  // Public endpoints (no auth required)
  getPublicRequest: (requestId: string, sharerCode: string) =>
    request<PublicRequestData>(
      `/marketplace/request/${requestId}/${sharerCode}`,
      {
        skipAutoRefresh: true,
      }
    ),

  trackEvent: (
    requestId: string,
    sharerCode: string,
    event: { eventType: string; metadata?: Record<string, unknown> }
  ) =>
    request<{ success: boolean }>(
      `/marketplace/request/${requestId}/${sharerCode}/track`,
      {
        method: "POST",
        body: JSON.stringify(event),
        skipAutoRefresh: true,
      }
    ),

  // Protected endpoints (auth required)
  browse: (params?: {
    page?: number;
    limit?: number;
    bountyMin?: number;
    bountyMax?: number;
    sortBy?: string;
    urgency?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.bountyMin)
      searchParams.append("bountyMin", params.bountyMin.toString());
    if (params?.bountyMax)
      searchParams.append("bountyMax", params.bountyMax.toString());
    if (params?.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params?.urgency) searchParams.append("urgency", params.urgency);
    const query = searchParams.toString();
    return request<{
      requests: Array<{
        id: string;
        contactName: string;
        meetingTitle: string;
        bountyAmount: number;
        isUrgent: boolean;
        daysRemaining: number;
        interestedCount: number;
        viewsCount: number;
        createdAt: string;
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
    }>(`/marketplace/browse${query ? `?${query}` : ""}`);
  },

  getFilters: () =>
    request<{
      urgencyOptions: Array<{ value: string; label: string }>;
      bountyRange: { min: number; max: number };
      sortOptions: Array<{ value: string; label: string }>;
    }>("/marketplace/browse/filters"),

  // Request management
  removeRequest: (requestId: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/marketplace/request/${requestId}`, {
      method: "DELETE",
    }),

  // Verification status
  getVerificationStatus: () =>
    request<{
      id: string;
      status:
        | "pending"
        | "in_progress"
        | "claimed_completed"
        | "not_claimed_failed";
      sourcesChecked: ImportSource[];
      prospectName: string | null;
      prospectCompany: string | null;
      prospectTitle: string | null;
      bountyAmount: number | null;
      claimerShare: number | null;
      matchedContactId: number | null;
      matchedSource: ImportSource | null;
      createdAt: string;
      resolvedAt: string | null;
      verificationTriggeredAt: string | null;
    } | null>("/marketplace/verification/status"),

  refreshVerification: () =>
    request<{
      message: string;
    }>("/marketplace/verification/refresh", {
      method: "POST",
    }),

  triggerManualVerification: () =>
    request<{
      success: boolean;
      alreadyTriggered: boolean;
      message: string;
    }>("/marketplace/claim/trigger-verification", {
      method: "POST",
    }),

  // Re-export from submodules
  ...sharesApi,
  ...claimsApi,
  ...trackingApi,
};
