/**
 * Payout Fee Configuration
 *
 * Stripe Global Payouts charges the platform a standard payout fee plus, for
 * cross-border/foreign-currency payouts, a cross-border fee and an FX fee.
 * These rates pass those costs on to the recipient (deducted from their payout).
 *
 * To revert to the platform bearing all fees, set
 * `DEDUCT_PAYOUT_FEES_FROM_RECIPIENT=false` — no code change required.
 */

import { getOsEnv } from "config/env.config";
import { PayoutCountryCode } from "config/payment.config";

/**
 * Master switch. When `false`, the platform absorbs all payout fees and the
 * recipient receives the full amount (fees are still computed and recorded for
 * reporting, just not deducted).
 *
 * @default true
 */
export const DEDUCT_PAYOUT_FEES_FROM_RECIPIENT =
  (getOsEnv("DEDUCT_PAYOUT_FEES_FROM_RECIPIENT") || "true").toLowerCase() !==
  "false";

/** Standard per-payout fee in USD cents (Stripe local-bank payout, US sender). */
export const STANDARD_PAYOUT_FEE_CENTS = 150;

/** Fee rates for a US-based platform paying out via local bank transfer. */
export interface PayoutFeeRates {
  /** Flat fee per payout, in USD cents. */
  standardFeeCents: number;
  /** Cross-border fee as a fraction of the payout (e.g. 0.0075 = 0.75%). */
  crossBorderPct: number;
  /** Currency-conversion (FX) fee as a fraction of the payout. */
  fxPct: number;
}

/**
 * Per-country payout fee rates. Source: Stripe Global Payouts published pricing
 * (US sender, local bank). Edit here to match your Stripe contract — this is the
 * single source of truth for payout fee math.
 */
export const PAYOUT_FEE_RATES: Record<PayoutCountryCode, PayoutFeeRates> = {
  US: {
    standardFeeCents: STANDARD_PAYOUT_FEE_CENTS,
    crossBorderPct: 0,
    fxPct: 0,
  },
  IN: {
    standardFeeCents: STANDARD_PAYOUT_FEE_CENTS,
    crossBorderPct: 0.0075,
    fxPct: 0.01,
  },
  PH: {
    standardFeeCents: STANDARD_PAYOUT_FEE_CENTS,
    crossBorderPct: 0.01,
    fxPct: 0.01,
  },
  MX: {
    standardFeeCents: STANDARD_PAYOUT_FEE_CENTS,
    crossBorderPct: 0.0025,
    fxPct: 0.01,
  },
  ZA: {
    standardFeeCents: STANDARD_PAYOUT_FEE_CENTS,
    crossBorderPct: 0.005,
    fxPct: 0.01,
  },
};
