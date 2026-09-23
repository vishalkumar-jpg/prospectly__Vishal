/**
 * Typed shapes for Stripe's v2 Money Management / Global Payouts APIs.
 *
 * These endpoints are in limited public preview and are NOT yet exposed as
 * typed resources by stripe-node (even on the latest SDK), so we reach them via
 * `stripe.rawRequest(...)` and validate the responses against these interfaces.
 *
 * Pin every v2 call to {@link STRIPE_V2_API_VERSION}. Bump deliberately — the
 * preview surface can change between versions.
 */

/** Preview API version used for all v2 Global Payouts calls. */
export const STRIPE_V2_API_VERSION = "2026-06-24.preview";

/** Capability/onboarding status as reported by the recipient account. */
export type V2CapabilityStatus =
  | "active"
  | "pending"
  | "restricted"
  | "unsupported"
  | "inactive";

export interface V2RecipientAccount {
  id: string;
  contact_email?: string;
  display_name?: string;
  identity?: {
    country?: string;
    entity_type?: string;
  };
  configuration?: {
    recipient?: {
      /** True once the recipient configuration has been applied/onboarded. */
      applied?: boolean;
      capabilities?: {
        bank_accounts?: {
          local?: { status?: V2CapabilityStatus };
          wire?: { status?: V2CapabilityStatus };
        };
      };
      /**
       * Default payout method once a bank account is added. The v2 API may
       * return a bare id string OR an object — always resolve via
       * `StripeService.coercePayoutMethodId`, never read directly as a string.
       */
      default_outbound_destination?: unknown;
    };
  };
  requirements?: {
    entries?: unknown[];
    summary?: { currently_due?: unknown[] };
  };
}

export interface V2AccountLink {
  url: string;
  /** RFC3339 timestamp; v2 links expire ~3 days after creation. */
  expires_at?: string;
}

export interface V2PayoutMethod {
  id: string;
  type?: string;
  bank_account?: {
    last4?: string;
    bank_name?: string;
    country?: string;
    currency?: string;
  };
}

export interface V2PayoutMethodList {
  data: V2PayoutMethod[];
}

/** Lifecycle status for an OutboundPayment. */
export type V2OutboundPaymentStatus =
  | "processing"
  | "posted"
  | "failed"
  | "returned"
  | "canceled";

export interface V2OutboundPayment {
  id: string;
  status?: V2OutboundPaymentStatus;
  amount?: { value: number; currency: string };
  metadata?: Record<string, string>;
  to?: { recipient?: string; payout_method?: string };
  description?: string;
}

/**
 * Minimal "thin event" delivered to the v2 webhook endpoint. The full object
 * must be fetched from `related_object.url` via {@link StripePayoutsService.fetchV2Resource}.
 */
export interface V2ThinEvent {
  id: string;
  type: string;
  created?: string;
  related_object?: {
    id: string;
    type: string;
    url: string;
  };
}

/** Parameters for creating an OutboundPayment (platform → recipient). */
export interface CreateOutboundPaymentParams {
  /** Amount in source-currency minor units (USD cents). */
  amountCents: number;
  /** Recipient account id (`acct_…`). */
  recipientAccountId: string;
  /**
   * Recipient's payout method id (their local bank account). Optional — when
   * omitted, Stripe pays the recipient's default outbound destination.
   */
  payoutMethodId?: string | null;
  description?: string;
  metadata?: Record<string, string>;
  /**
   * Stable key (e.g. the payout row id) so retries never create a duplicate
   * payment — Stripe returns the original OutboundPayment for the same key.
   */
  idempotencyKey?: string;
}
