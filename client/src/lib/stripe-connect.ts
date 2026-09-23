import type { PayoutStatus } from "@/lib/api/payments";

/** Minimal subset of payout status used to decide setup completeness. */
export type PayoutSetupFlags = {
  onboardingComplete?: boolean;
  capabilityStatus?: string | null;
  payoutsReady?: boolean;
};

/**
 * React Query key for the payout status query.
 * (Kept named with the historical "stripe-connect" prefix for cache continuity.)
 */
export const getStripePayoutStatusQueryKey = (userId: string | number) =>
  ["/api/stripe/payouts/status", userId] as const;

export const openExternalUrlInNewTab = (url: string): void => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

/**
 * Payout setup is complete once the user has added a local bank account. The
 * server gates `onboardingComplete` on a resolved payout method, so we trust it
 * directly — NOT the raw `capabilityStatus`, which flips to "active" when the
 * capability is granted (before any bank exists).
 */
export const isStripePayoutSetupComplete = (
  status: PayoutSetupFlags | null | undefined
): boolean => Boolean(status?.onboardingComplete === true);

/**
 * Resolves the display state of a connected payout account:
 * - `active`     — capability is live; the account can receive payouts.
 * - `verifying`  — a bank account was added; Stripe is still verifying it.
 * - `attention`  — the account exists but no bank account has been added yet,
 *                  so the user still needs to finish onboarding ("Information Needed").
 */
export const getPayoutAccountState = (
  status: PayoutSetupFlags | null | undefined
): "active" | "verifying" | "attention" => {
  if (status?.payoutsReady) return "active";
  if (status?.onboardingComplete) return "verifying";
  return "attention";
};

/** Supported payout countries and their resulting payout currency. */
export const PAYOUT_COUNTRIES = [
  { value: "US", label: "United States", currency: "USD" },
  { value: "IN", label: "India", currency: "INR" },
  { value: "PH", label: "Philippines", currency: "PHP" },
  { value: "MX", label: "Mexico", currency: "MXN" },
  { value: "ZA", label: "South Africa", currency: "ZAR" },
] as const;

export type PayoutCountryCode = (typeof PAYOUT_COUNTRIES)[number]["value"];

/** Mirrors the server `getSalaryCurrencySymbol` util. */
const PAYOUT_CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  INR: "₹",
  ZAR: "R",
  PHP: "₱",
  MXN: "MX$",
};

export const getPayoutCurrencySymbol = (
  currency: string | null | undefined
): string => (currency ? (PAYOUT_CURRENCY_SYMBOLS[currency] ?? currency) : "");

export const getPayoutCurrencyForCountry = (
  country: string | null | undefined
): string | null =>
  PAYOUT_COUNTRIES.find((c) => c.value === country)?.currency ?? null;

export type { PayoutStatus };
