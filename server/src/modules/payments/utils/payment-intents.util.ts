/**
 * Payment Intent Utilities
 *
 * Provides helper functions for creating and managing Stripe PaymentIntents.
 * Handles extended authorization configuration and validation.
 */

import Stripe from "stripe";
import {
  PAYMENT_AUTHORIZATION_DAYS,
  STRIPE_CURRENCY,
  PAYMENT_STATUS,
} from "config/payment.config";
import { utcDayjs } from "utils/dayjs";

/**
 * Result of creating dual PaymentIntents.
 */
export interface DualPaymentIntentsResult {
  /** The 5% initial PaymentIntent */
  initialPaymentIntent: Stripe.PaymentIntent;
  /** The 95% remaining PaymentIntent */
  remainingPaymentIntent: Stripe.PaymentIntent;
  /** Amount details */
  amounts: {
    initialAmountCents: number;
    remainingAmountCents: number;
    totalAmountCents: number;
  };
}

/**
 * Configuration for creating a PaymentIntent with extended authorization.
 */
export interface ExtendedAuthorizationConfig {
  /** Request extended authorization capture window */
  request_extended_authorization?: boolean;
  /** Request incremental authorization capability */
  request_incremental_authorization?: "if_available" | "never";
}

/**
 * Metadata attached to PaymentIntents for tracking.
 */
export interface PaymentIntentMetadata {
  /** The introduction request ID */
  requestId: string;
  /** The user ID who initiated the payment */
  userId: string;
  /** Type of payment */
  type: "introduction_bounty_initial" | "introduction_bounty_remaining";
  /** Percentage of total bounty */
  percentage: string;
}

/**
 * Returns configuration for extended authorization.
 * Extended authorization allows holding funds for up to 30 days
 * instead of the default 7-day window for most card networks.
 *
 * Note: Extended authorization is only available for:
 * - Visa, Mastercard in specific regions
 * - Requires Stripe account configuration
 *
 * @returns Configuration object for extended authorization
 */
export function getExtendedAuthorizationConfig(): ExtendedAuthorizationConfig {
  return {
    request_extended_authorization: true,
    request_incremental_authorization: "if_available",
  };
}

/**
 * Creates options for a PaymentIntent with manual capture.
 * This sets up the intent for authorization-only (no immediate charge).
 *
 * Note: Extended authorization features are disabled by default as they
 * require specific Stripe account configuration. Standard manual capture
 * provides a 7-day authorization window which is sufficient for most use cases.
 *
 * @param amountCents - Amount in cents
 * @param customerId - Stripe customer ID
 * @param paymentMethodId - Stripe payment method ID
 * @param metadata - Custom metadata for tracking
 * @param useExtendedAuth - Whether to request extended authorization (requires account eligibility)
 * @returns Stripe PaymentIntent create options
 */
export function createPaymentIntentOptions(
  amountCents: number,
  customerId: string,
  paymentMethodId: string,
  metadata: PaymentIntentMetadata,
  useExtendedAuth = false // Disabled by default - requires Stripe account eligibility
): Stripe.PaymentIntentCreateParams {
  const options: Stripe.PaymentIntentCreateParams = {
    amount: amountCents,
    currency: STRIPE_CURRENCY,
    customer: customerId,
    payment_method: paymentMethodId,
    capture_method: "manual",
    confirm: true,
    off_session: true,
    metadata: metadata as unknown as Stripe.MetadataParam,
  };

  // Extended authorization allows holding funds for up to 30 days
  // Only enable if the Stripe account is specifically configured for this
  // See: https://stripe.com/docs/payments/extended-authorization
  if (useExtendedAuth) {
    options.payment_method_options = {
      card: {
        request_extended_authorization: "if_available",
        request_incremental_authorization: "if_available",
      },
    };
  }

  return options;
}

/**
 * Validates that a PaymentIntent is in a valid state for capture.
 *
 * @param paymentIntent - The Stripe PaymentIntent object
 * @returns Object with validation result and details
 */
export function validatePaymentIntentForCapture(
  paymentIntent: Stripe.PaymentIntent
): {
  isValid: boolean;
  reason?: string;
  status: string;
} {
  const validStatuses = ["requires_capture"];

  if (!validStatuses.includes(paymentIntent.status)) {
    return {
      isValid: false,
      reason: `PaymentIntent status '${paymentIntent.status}' is not valid for capture. Expected 'requires_capture'.`,
      status: paymentIntent.status,
    };
  }

  // Check if authorization has expired
  // PaymentIntents have a 7-day default window (or extended if configured)
  const createdAt = utcDayjs(paymentIntent.created * 1000);
  const now = utcDayjs();
  const daysSinceCreation = now.diff(createdAt, "day", true);

  if (daysSinceCreation > PAYMENT_AUTHORIZATION_DAYS) {
    return {
      isValid: false,
      reason: `PaymentIntent authorization has expired. Created ${Math.floor(daysSinceCreation)} days ago, max ${PAYMENT_AUTHORIZATION_DAYS} days.`,
      status: paymentIntent.status,
    };
  }

  return {
    isValid: true,
    status: paymentIntent.status,
  };
}

/**
 * Validates that a PaymentIntent was successfully created and authorized.
 *
 * @param paymentIntent - The Stripe PaymentIntent object
 * @returns Object with validation result and details
 */
export function validatePaymentIntentCreation(
  paymentIntent: Stripe.PaymentIntent
): {
  isSuccess: boolean;
  requiresAction: boolean;
  reason?: string;
  status: string;
} {
  // Check if successfully authorized
  if (paymentIntent.status === "requires_capture") {
    return {
      isSuccess: true,
      requiresAction: false,
      status: paymentIntent.status,
    };
  }

  // Check if requires additional action (3D Secure, etc.)
  if (paymentIntent.status === "requires_action") {
    return {
      isSuccess: false,
      requiresAction: true,
      reason:
        "Payment requires additional authentication. Please complete the authentication process.",
      status: paymentIntent.status,
    };
  }

  // Check for explicit failure states
  if (paymentIntent.status === "canceled" || paymentIntent.last_payment_error) {
    const errorMessage =
      paymentIntent.last_payment_error?.message ||
      "Payment authorization failed";
    return {
      isSuccess: false,
      requiresAction: false,
      reason: errorMessage,
      status: paymentIntent.status,
    };
  }

  // Unexpected status
  return {
    isSuccess: false,
    requiresAction: false,
    reason: `Unexpected payment status: ${paymentIntent.status}`,
    status: paymentIntent.status,
  };
}

/**
 * Creates metadata for the initial (5%) PaymentIntent.
 *
 * @param requestId - Introduction request ID
 * @param userId - User ID
 * @returns Metadata object
 */
export function createInitialPaymentMetadata(
  requestId: string,
  userId: string
): PaymentIntentMetadata {
  return {
    requestId,
    userId,
    type: "introduction_bounty_initial",
    percentage: "5",
  };
}

/**
 * Creates metadata for the remaining (95%) PaymentIntent.
 *
 * @param requestId - Introduction request ID
 * @param userId - User ID
 * @returns Metadata object
 */
export function createRemainingPaymentMetadata(
  requestId: string,
  userId: string
): PaymentIntentMetadata {
  return {
    requestId,
    userId,
    type: "introduction_bounty_remaining",
    percentage: "95",
  };
}

/**
 * Maps PaymentIntent status to internal payment status.
 *
 * @param stripeStatus - Stripe PaymentIntent status
 * @returns Internal payment status
 */
export function mapStripeStatusToPaymentStatus(
  stripeStatus: Stripe.PaymentIntent.Status
): string {
  const statusMap: Record<string, string> = {
    requires_payment_method: PAYMENT_STATUS.PENDING,
    requires_confirmation: PAYMENT_STATUS.PENDING,
    requires_action: PAYMENT_STATUS.PENDING,
    processing: PAYMENT_STATUS.PENDING,
    requires_capture: PAYMENT_STATUS.AUTHORIZED,
    succeeded: PAYMENT_STATUS.CAPTURED,
    canceled: PAYMENT_STATUS.CANCELED,
  };

  return statusMap[stripeStatus] || PAYMENT_STATUS.PENDING;
}

/**
 * Extracts the error message from a Stripe error or PaymentIntent.
 *
 * @param error - Stripe error or PaymentIntent with error
 * @returns Human-readable error message
 */
export function extractStripeErrorMessage(error: unknown): string {
  // Type guard for error with properties
  const err = error as {
    type?: string;
    message?: string;
    last_payment_error?: { message?: string };
  } | null;

  // Handle Stripe API errors
  if (
    err?.type === "StripeCardError" ||
    err?.type === "StripeInvalidRequestError"
  ) {
    return err.message || "Payment processing error";
  }

  // Handle PaymentIntent with last_payment_error
  if (err?.last_payment_error) {
    return err.last_payment_error.message || "Payment authorization failed";
  }

  // Handle generic error objects
  if (err?.message) {
    return err.message;
  }

  return "An unexpected payment error occurred";
}
