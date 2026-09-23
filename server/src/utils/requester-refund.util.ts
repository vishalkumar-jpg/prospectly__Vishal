import { PAYMENT_STAGE_NAMES } from "modules/introductions/refunds/refunds.constants";
import {
  calculateSplitAmounts,
  convertToDollars,
} from "modules/payments/utils/payment-calculations.util";

/**
 * Returns refundable cents for a stage.
 * Legacy (storedTotalAmountDollars <= 0): full captured amount.
 * New fee model: cap at 5%/95% of bounty only (fees non-refundable).
 */
export function getRefundableAmountCentsForStage(
  stageName: string,
  bountyAmountDollars: number | string,
  capturedOrAuthorizedCents: number,
  storedTotalAmountDollars?: number
): number {
  const bountyCents = Math.round(
    (typeof bountyAmountDollars === "string"
      ? parseFloat(bountyAmountDollars)
      : bountyAmountDollars) * 100
  );

  if (
    !Number.isFinite(bountyCents) ||
    bountyCents <= 0 ||
    capturedOrAuthorizedCents <= 0
  ) {
    return 0;
  }

  const storedTotal =
    storedTotalAmountDollars !== undefined && storedTotalAmountDollars > 0
      ? Math.round(storedTotalAmountDollars * 100)
      : 0;

  if (storedTotal <= 0) {
    return capturedOrAuthorizedCents;
  }

  const bountySplit = calculateSplitAmounts(bountyAmountDollars);
  let capCents = 0;
  if (stageName === PAYMENT_STAGE_NAMES.INTRO_EMAIL_SENT) {
    capCents = bountySplit.initialAmountCents;
  } else if (stageName === PAYMENT_STAGE_NAMES.MEETING_BOOKED) {
    capCents = bountySplit.remainingAmountCents;
  } else {
    capCents = capturedOrAuthorizedCents;
  }

  return Math.min(capturedOrAuthorizedCents, capCents);
}

export function getRefundableAmountDollarsForStage(
  stageName: string,
  bountyAmountDollars: number | string,
  capturedOrAuthorizedDollars: number,
  storedTotalAmountDollars?: number
): number {
  const cents = getRefundableAmountCentsForStage(
    stageName,
    bountyAmountDollars,
    Math.round(capturedOrAuthorizedDollars * 100),
    storedTotalAmountDollars
  );
  return convertToDollars(cents);
}
