export interface SubscriptionTransactionMetadata {
  stripe_price_id?: string;
  subscription_plan_price_id?: string;
  price?: string | number;
  interval?: string;
  [key: string]: unknown;
}

export const SUBSCRIPTION_TRANSACTION_TYPES = {
  CREATED: "created",
  UPGRADED: "upgraded",
  DOWNGRADED: "downgraded",
  CANCELED: "canceled",
  RENEWED: "renewed",
  UPDATED: "updated",
  COUPON_APPLIED: "coupon_applied",
} as const;

export type SubscriptionTransactionType =
  (typeof SUBSCRIPTION_TRANSACTION_TYPES)[keyof typeof SUBSCRIPTION_TRANSACTION_TYPES];

/**
 * Exact v2 (Global Payouts) thin-event type strings, from Stripe's v2 API
 * reference. Routed in `routeV2Event`. Update here if Stripe's live preview
 * strings drift (the router logs any unhandled type so drift is visible).
 */
export const V2_ACCOUNT_EVENT_TYPES = [
  "v2.core.account[configuration.recipient].updated",
] as const;

export const V2_OUTBOUND_PAYMENT_EVENT_TYPES = [
  "outbound_payment.created",
  "outbound_payment.posted",
  "outbound_payment.failed",
  "outbound_payment.canceled",
  "outbound_payment.returned",
] as const;
