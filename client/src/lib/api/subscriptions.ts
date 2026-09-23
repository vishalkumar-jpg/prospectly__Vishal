/**
 * Subscriptions API Module
 * Handles subscription plans and billing endpoints
 */

import { request } from "./core";
import type { AnyType } from "../../types/common";

export const subscriptionsApi = {
  getPlans: () =>
    request<{
      plans: Array<{
        id: string;
        name: string;
        description: string;
        monthlyPrice: {
          id: string;
          price: string;
          stripePriceId: string;
        } | null;
        yearlyPrice: {
          id: string;
          price: string;
          stripePriceId: string;
        } | null;
        features: AnyType;
        isDefault: boolean;
      }>;
    }>("/subscriptions/plans"),

  getCurrentSubscription: () =>
    request<{
      id: string;
      plan: {
        id: string;
        name: string;
        description: string;
        features: AnyType;
        isDefault: boolean;
      };
      status: string;
      currentPeriodStart: string;
      currentPeriodEnd: string;
      cancelAtPeriodEnd: boolean;
      stripeSubscriptionId: string;
    } | null>("/subscriptions/current"),

  createPortalSession: (returnUrl: string) =>
    request<{ url: string }>("/subscriptions/portal", {
      method: "POST",
      body: JSON.stringify({ returnUrl }),
    }),

  getHistory: (page: number = 1, limit: number = 10) =>
    request<{
      transactions: Array<{
        id: string;
        transactionType: string;
        fromPlan: { id: string; name: string } | null;
        toPlan: { id: string; name: string } | null;
        amount: number | null;
        currency: string;
        stripeEventId: string | null;
        metadata: AnyType;
        createdAt: string;
      }>;
      meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(`/subscriptions/history?page=${page}&limit=${limit}`),

  createUpgradePortalSession: (planId: string, interval: string) =>
    request<{ url: string }>("/subscriptions/upgrade-portal", {
      method: "POST",
      body: JSON.stringify({ planId, interval }),
    }),

  sync: () =>
    request<{ message: string }>("/subscriptions/sync", {
      method: "POST",
    }),
};
