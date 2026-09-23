/**
 * Payments API Module
 * Handles payments, Stripe payouts, and finances endpoints
 */

import { request } from "./core";
import type { AnyType } from "../../types/common";

/**
 * Payout onboarding status returned by GET /stripe/payouts/status.
 * Reflects Stripe Global Payouts (recipient + local bank account) onboarding.
 */
export interface PayoutStatus {
  isConnected: boolean;
  accountId: string | null;
  onboardingComplete: boolean;
  /** True when the recipient capability is active (can actually receive payouts). */
  payoutsReady?: boolean;
  capabilityStatus: string | null;
  requiresAction: boolean;
  country: string | null;
  countryName: string | null;
  payoutCurrency: string | null;
  payoutMethodId?: string | null;
  message: string;
}

export const paymentsApi = {
  authorizePayment: (data: { requestId: number; amount: number }) =>
    request<{ paymentIntent: AnyType }>("/payments/authorize", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  capturePayment: (data: {
    paymentIntentId: string;
    amount: number;
    stage: string;
  }) =>
    request<{ charge: AnyType }>("/payments/capture", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const stripeApi = {
  /** Current payout onboarding status for the signed-in user. */
  getPayoutStatus: () => request<PayoutStatus>("/stripe/payouts/status"),

  /**
   * Create (or resume) the recipient account and get a Stripe-hosted
   * onboarding URL for adding the user's local bank account.
   */
  createPayoutAccount: (data?: { returnUrl?: string; refreshUrl?: string }) =>
    request<{
      accountId: string;
      url: string | null;
      alreadyConnected?: boolean;
      message: string;
    }>("/stripe/payouts/account", {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  /** Refresh an expired onboarding link. */
  getPayoutAccountLink: () =>
    request<{ url: string | null; alreadyConnected?: boolean }>(
      "/stripe/payouts/account-link"
    ),

  /** Disconnect the payout (recipient) account. */
  disconnectPayoutAccount: () =>
    request<{ message: string; success: boolean }>(
      "/stripe/payouts/disconnect",
      {
        method: "POST",
      }
    ),
};

export const financesApi = {
  getPayoutTimeline: () =>
    request<{
      timeline: Array<{
        id: string;
        status: string;
        amount: number;
        description: string;
        contactName?: string;
        createdAt: string;
        paidOutAt?: string;
      }>;
      totalPending: number;
      totalCompleted: number;
    }>("/finances/payout-timeline"),

  getRequestPayout: (requestId: string) =>
    request<{
      requestId: string;
      contactName: string;
      requester?: {
        fullName?: string;
        email?: string;
      } | null;
      requesterName?: string;
      requesterEmail?: string;
      grossAmount: number;
      netAmount: number;
      payoutStatus?: string;
      payoutReleased: boolean;
      payoutReleasedAt: string | null;
      payoutTriggeredBy?: string | null;
      currentTrustScore?: number | null;
      qualifiesForImmediatePayout?: boolean;
      workflowProgress?: Array<{
        step: string;
        label: string;
        description: string;
        status: "completed" | "current" | "pending" | "skipped";
        completedAt: string | null;
        actionNeeded: string | null;
      }>;
      createdAt?: string;
      creditsApplied?: number;
      commissionAfterCredits?: number;
      creditsRemainingAfter?: number;
      isMarketplaceDeal?: boolean;
      marketplaceRole?: "claimer" | "sharer" | null;
      claimerShare?: number;
      sharerShare?: number;
      relatedPayoutId?: string | null;
      payoutAccountConnected?: boolean;
      payoutOnboardingComplete?: boolean;
    }>(`/finances/requests/${requestId}/payout`),
};
