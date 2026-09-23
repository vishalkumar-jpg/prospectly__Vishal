/**
 * Invites API Module
 * Handles invitation system endpoints
 */

import { request } from "./core";
import type { AnyType } from "../../types/common";

export const invitesApi = {
  getByToken: (token: string) =>
    request<{
      id: string;
      email: string;
      inviteType: string;
      subscriptionPlan: {
        id: string;
        name: string;
        description: string;
      } | null;
      status: string;
      expiresAt: string;
      organisationId: string | null;
      organisationName: string | null;
    }>(`/invites/${token}`),

  validate: (token: string, email: string) =>
    request<{
      eligible: boolean;
      reason?: string;
      invite: {
        id: string;
        email: string;
        inviteType: string;
        status: string;
      } | null;
    }>(`/invites/${token}/validate`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  accept: (token: string, googleUser?: AnyType) =>
    request<{
      user?: { id: string; email: string };
      invite: { id: string; status: string };
      subscription?: { id: string; status: string } | null;
    }>(`/invites/${token}/accept`, {
      method: "POST",
      body: JSON.stringify({ googleUser }),
    }),

  generate: (data: {
    contactIds: string[];
    planId: string;
    organisationId?: string;
    customHtml?: string;
    inviteText?: string;
    country: string;
  }) =>
    request<{ email: string; inviteLink?: string; error?: string }[]>(
      "/invites/generate",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  getLeaderPermissions: () =>
    request<
      {
        id: string;
        userId: string;
        organisationId: string;
        allowedPlanIds: string[];
        maxInvitesPerMonth: number | null;
        invitesUsedThisMonth: number;
        organisation?: {
          name: string;
        };
      }[]
    >("/invites/leader-permissions"),

  resend: (data: { contactId: string }) =>
    request<{ email: string; inviteLink: string }>("/invites/resend", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
