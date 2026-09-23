import { CreditUsageHelper } from "modules/credits/helpers/credit-usage.helper";
import {
  convertToCents,
  convertToDollars,
} from "modules/payments/utils/payment-calculations.util";
import { formatRecruitmentUsd } from "./recruitment-lifecycle-format.util";

export type PayoutReleasedCreditEmailVars = {
  hasCreditsApplied: boolean;
  hasCreditsRemainingAfter: boolean;
  basePayoutAmount: string;
  creditsUsedAmount: string;
  creditsRemainingAfter: string;
  payoutAmount: string;
};

/**
 * Projects credit application for a payout-release email using the same
 * calculator path as RecruitmentPayoutQueueProcessor (credits offset the
 * recipient's platform slice and are added to their payout).
 */
export async function buildPayoutReleasedCreditEmailVars(
  creditUsageHelper: CreditUsageHelper,
  recipientId: string,
  recipientAmount: string,
  platformAmount: string
): Promise<PayoutReleasedCreditEmailVars> {
  const recipientBaseCents = convertToCents(recipientAmount);
  const platformBaseCents = convertToCents(platformAmount);

  const creditApplication =
    await creditUsageHelper.calculateCreditApplicationForUser(
      recipientId,
      platformBaseCents
    );

  const hasCreditsApplied = creditApplication.creditsToApply > 0;
  const hasCreditsRemainingAfter =
    hasCreditsApplied && creditApplication.newBalance > 0;
  const netCents = recipientBaseCents + creditApplication.connectorBonusCents;
  const basePayoutAmount = formatRecruitmentUsd(recipientAmount);

  return {
    hasCreditsApplied,
    hasCreditsRemainingAfter,
    basePayoutAmount,
    creditsUsedAmount: hasCreditsApplied
      ? formatRecruitmentUsd(creditApplication.creditsToApply)
      : "",
    creditsRemainingAfter: hasCreditsRemainingAfter
      ? formatRecruitmentUsd(creditApplication.newBalance)
      : "",
    payoutAmount: formatRecruitmentUsd(convertToDollars(netCents)),
  };
}
