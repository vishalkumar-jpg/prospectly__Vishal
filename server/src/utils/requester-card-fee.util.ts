/**
 * Requester card fee gross-up (shared by recruitment shortlist and prospecting).
 * Formula: total = (bounty + processingFee + fixedFee) / (1 - stripePercent)
 */

import { convertToCents } from "modules/payments/utils/payment-calculations.util";
import {
  STRIPE_PERCENTAGE_FEE,
  STRIPE_FIXED_FEE_CENTS,
  PROCESSING_FEE_DOLLARS,
} from "./requester-card-fee.constants";

export interface RequesterCardFeeBreakdown {
  bountyAmountDollars: number;
  providerFeeDollars: number;
  processingFeeDollars: number;
  totalDollars: number;
  totalCents: number;
}

function buildRequesterCardFeeBreakdown(
  bountyAmountDollars: number | string
): RequesterCardFeeBreakdown {
  const bounty =
    typeof bountyAmountDollars === "string"
      ? parseFloat(bountyAmountDollars)
      : bountyAmountDollars;

  if (isNaN(bounty) || bounty <= 0) {
    throw new Error(`Invalid referral payout amount: ${bountyAmountDollars}`);
  }

  const fixedFeeDollars = STRIPE_FIXED_FEE_CENTS / 100;
  const stripePercent = STRIPE_PERCENTAGE_FEE / 100;

  const totalDollars =
    (bounty + PROCESSING_FEE_DOLLARS + fixedFeeDollars) / (1 - stripePercent);

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

export function calculateShortlistFees(
  bountyAmountDollars: number | string
): RequesterCardFeeBreakdown {
  return buildRequesterCardFeeBreakdown(bountyAmountDollars);
}

/** Alias used by prospecting payments and fee preview APIs */
export function calculateRequesterCardFees(
  bountyAmountDollars: number | string
): RequesterCardFeeBreakdown {
  return buildRequesterCardFeeBreakdown(bountyAmountDollars);
}
