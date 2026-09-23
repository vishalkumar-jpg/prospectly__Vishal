/**
 * Shortlist Fee Calculation Utility
 *
 * Uses algebraic inversion so payment-provider fees are fully covered by the recruiter.
 * Formula: total = (bounty + processingFee + fixedFee) / (1 - stripePercent)
 * providerFee = total - bounty - processingFee
 */

import { convertToCents } from "modules/payments/utils/payment-calculations.util";
import {
  STRIPE_PERCENTAGE_FEE,
  STRIPE_FIXED_FEE_CENTS,
  PROCESSING_FEE_DOLLARS,
} from "./shortlist-fee.constants";

export interface ShortlistFeeBreakdown {
  bountyAmountDollars: number;
  providerFeeDollars: number;
  processingFeeDollars: number;
  totalDollars: number;
  totalCents: number;
}

export function calculateShortlistFees(
  bountyAmountDollars: number | string
): ShortlistFeeBreakdown {
  const bounty =
    typeof bountyAmountDollars === "string"
      ? parseFloat(bountyAmountDollars)
      : bountyAmountDollars;

  if (isNaN(bounty) || bounty <= 0) {
    throw new Error(`Invalid referral payout amount: ${bountyAmountDollars}`);
  }

  const fixedFeeDollars = STRIPE_FIXED_FEE_CENTS / 100;
  const stripePercent = STRIPE_PERCENTAGE_FEE / 100;

  // Algebraic inversion: total = (bounty + processingFee + fixedFee) / (1 - stripePercent)
  const totalDollars =
    (bounty + PROCESSING_FEE_DOLLARS + fixedFeeDollars) / (1 - stripePercent);

  // Round to 2 decimal places
  const roundedTotal = Math.round(totalDollars * 100) / 100;
  const providerFeeDollars =
    Math.round((roundedTotal - bounty - PROCESSING_FEE_DOLLARS) * 100) / 100;

  return {
    bountyAmountDollars: bounty,
    providerFeeDollars,
    processingFeeDollars: PROCESSING_FEE_DOLLARS,
    totalDollars: roundedTotal,
    totalCents: convertToCents(roundedTotal),
  };
}
