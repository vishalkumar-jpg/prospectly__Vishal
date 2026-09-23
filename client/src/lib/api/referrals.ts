/**
 * Referrals API Module
 * Handles referral progress and coupon endpoints
 */

import { request } from "./core";
import type { AnyType } from "../../types/common";

export const referralsApi = {
  getProgress: () =>
    request<{
      totalInvitesSent: number;
      totalInvitesAccepted: number;
      acceptedUsers: Array<{
        userId: string;
        email: string;
        fullName: string;
        subscriptionPlan: string;
        acceptedAt: string;
      }>;
      invitedUsers: Array<{
        email: string;
        fullName: string;
        subscriptionPlan: string;
        invitedAt: string;
        contactId?: string;
        subscriptionPlanId?: string;
        organisationId?: string | null;
        /** Present on API responses after enrichment */
        status?: string;
        acceptedAt?: string | null;
        expiresAt?: string;
      }>;
      earnedCoupons: AnyType[];
    }>("/referrals/progress"),

  sendInvite: (data: {
    email: string;
    planId: string;
    organisationId?: string;
  }) =>
    request<{ success: boolean; message: string }>("/referrals/invite", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getEarnedCoupons: () => request<AnyType[]>("/referrals/earned-coupons"),

  getVerifiedContacts: (planId: string) =>
    request<{ count: number }>(`/referrals/verified-contacts/${planId}`),

  createPortalSession: () =>
    request<{ url: string }>("/subscriptions/portal", {
      method: "POST",
    }),
};
