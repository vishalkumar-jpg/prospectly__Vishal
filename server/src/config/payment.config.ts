/**
 * Payment Configuration
 *
 * Centralized configuration for all payment-related settings.
 * Values are sourced from environment variables with sensible defaults.
 */

import { getOsEnv } from "config/env.config";

/**
 * Trust score threshold for immediate payout eligibility.
 * Connectors with trust scores >= this value receive immediate payouts.
 * Connectors below this threshold must wait for peer feedback.
 *
 * Trust scores are on a scale of 1-10.
 *
 * @default 8
 */
export const TRUST_SCORE_THRESHOLD = parseInt(
  getOsEnv("TRUST_SCORE_THRESHOLD") || "8",
  10
);

/**
 * Platform commission percentage (retained by platform).
 * This is the percentage of the bounty kept as platform fee.
 *
 * @default 20 (20%)
 */
export const PLATFORM_COMMISSION_PERCENT = 20;

/**
 * Connector payout percentage (paid to connector).
 * This is the percentage of the bounty paid to the connector.
 *
 * @default 80 (80%)
 */
export const CONNECTOR_PAYOUT_PERCENT = 80;

/**
 * Initial charge percentage (charged after email delivery).
 * This is the first milestone payment.
 *
 * @default 5 (5%)
 */
export const INITIAL_CHARGE_PERCENT = 5;

/**
 * Remaining charge percentage (charged before meeting booking).
 * This is the second milestone payment.
 *
 * @default 95 (95%)
 */
export const REMAINING_CHARGE_PERCENT = 95;

/**
 * Extended authorization days for Stripe PaymentIntents.
 * Stripe normally holds authorizations for 7 days.
 * Extended capture window allows up to 30 days for certain card networks.
 *
 * @default 30
 */
export const PAYMENT_AUTHORIZATION_DAYS = 30;

/**
 * Minimum bounty amount in dollars.
 * Requests below this amount are not allowed.
 *
 * @default 10
 */
export const MINIMUM_BOUNTY_AMOUNT = 10;

/**
 * Stripe platform/charge currency code.
 *
 * Requesters are always charged in this currency, and the platform balance /
 * Financial Account that funds payouts is denominated in it. International
 * payouts are converted from this currency to the recipient's local currency
 * by Stripe at payout time (see {@link PAYOUT_COUNTRY_CONFIG}).
 *
 * @default 'usd'
 */
export const STRIPE_CURRENCY = "usd";

/**
 * Countries supported for connector/candidate payouts via Stripe Global Payouts.
 * Stored on `users.country` as an ISO 3166-1 alpha-2 code.
 */
export const SUPPORTED_PAYOUT_COUNTRIES = [
  "US",
  "IN",
  "PH",
  "MX",
  "ZA",
] as const;

export type PayoutCountryCode = (typeof SUPPORTED_PAYOUT_COUNTRIES)[number];

/**
 * Per-country payout configuration.
 *
 * `currency` is the recipient's local settlement currency (lowercase ISO 4217,
 * as Stripe expects it). `minPayout*` are the minimum payout amounts Stripe
 * enforces — minimums apply to BOTH the source (USD) and the destination
 * currency, so an OutboundPayment must clear both thresholds.
 *
 * Minimum values are conservative placeholders; confirm exact thresholds
 * against Stripe's supported-settlement docs before go-live.
 */
export const PAYOUT_COUNTRY_CONFIG: Record<
  PayoutCountryCode,
  {
    name: string;
    /** lowercase ISO 4217, as passed to Stripe */
    currency: string;
    /** uppercase ISO 4217, for display / SALARY_CURRENCIES alignment */
    currencyUpper: string;
    /** minimum payout in the destination currency's major units */
    minPayoutLocal: number;
  }
> = {
  US: {
    name: "United States",
    currency: "usd",
    currencyUpper: "USD",
    minPayoutLocal: 1,
  },
  IN: {
    name: "India",
    currency: "inr",
    currencyUpper: "INR",
    minPayoutLocal: 50,
  },
  PH: {
    name: "Philippines",
    currency: "php",
    currencyUpper: "PHP",
    minPayoutLocal: 50,
  },
  MX: {
    name: "Mexico",
    currency: "mxn",
    currencyUpper: "MXN",
    minPayoutLocal: 20,
  },
  ZA: {
    name: "South Africa",
    currency: "zar",
    currencyUpper: "ZAR",
    minPayoutLocal: 100,
  },
};

/** Minimum payout in the source currency (USD major units), enforced on every payout. */
export const MINIMUM_PAYOUT_USD = 1;

/**
 * Returns true if the given ISO alpha-2 country code is a supported payout country.
 */
export function isSupportedPayoutCountry(
  country?: string | null
): country is PayoutCountryCode {
  return (
    !!country &&
    (SUPPORTED_PAYOUT_COUNTRIES as readonly string[]).includes(
      country.toUpperCase()
    )
  );
}

/**
 * Resolves the recipient's local payout currency (uppercase ISO 4217) from
 * their country. Falls back to USD for unknown/unset countries.
 */
export function getPayoutCurrencyForCountry(country?: string | null): string {
  if (isSupportedPayoutCountry(country)) {
    return PAYOUT_COUNTRY_CONFIG[country.toUpperCase() as PayoutCountryCode]
      .currencyUpper;
  }
  return "USD";
}

/**
 * Payment status constants for type safety.
 */
export const PAYMENT_STATUS = {
  PENDING: "pending",
  AUTHORIZED: "authorized",
  CAPTURED: "captured",
  FAILED: "failed",
  CANCELED: "canceled",
  REFUNDED: "refunded",
} as const;

/**
 * Payout trigger types.
 * Indicates what triggered the connector payout.
 */
export const PAYOUT_TRIGGER = {
  TRUST_SCORE: "trust_score",
  PEER_FEEDBACK: "peer_feedback",
} as const;

/**
 * Payout status constants.
 */
export const PAYOUT_STATUS = {
  PENDING: "pending",
  ELIGIBLE: "eligible",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

/**
 * Export all config as a single object for easy access.
 */
export const PaymentConfig = {
  TRUST_SCORE_THRESHOLD,
  PLATFORM_COMMISSION_PERCENT,
  CONNECTOR_PAYOUT_PERCENT,
  INITIAL_CHARGE_PERCENT,
  REMAINING_CHARGE_PERCENT,
  PAYMENT_AUTHORIZATION_DAYS,
  MINIMUM_BOUNTY_AMOUNT,
  STRIPE_CURRENCY,
  SUPPORTED_PAYOUT_COUNTRIES,
  PAYOUT_COUNTRY_CONFIG,
  MINIMUM_PAYOUT_USD,
  PAYMENT_STATUS,
  PAYOUT_TRIGGER,
  PAYOUT_STATUS,
} as const;

export default PaymentConfig;
