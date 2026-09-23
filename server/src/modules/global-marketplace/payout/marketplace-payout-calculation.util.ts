import { MARKETPLACE_PAYOUT_SPLIT } from "./marketplace-payout.constants";
import { MarketplacePayoutSplit } from "./marketplace-payout.types";

/**
 * Calculate the marketplace payout split
 *
 * Split breakdown:
 * - Platform: 20% of total
 * - Claimer: 40% of total (50% of remaining 80%)
 * - Sharer: 40% of total (50% of remaining 80%)
 *
 * @param bountyAmountCents - Total bounty amount in cents
 * @returns Split amounts in cents
 */
export function calculateMarketplacePayoutSplit(
  bountyAmountCents: number
): MarketplacePayoutSplit {
  const platformCents = Math.floor(
    (bountyAmountCents * MARKETPLACE_PAYOUT_SPLIT.PLATFORM_PERCENT) / 100
  );

  const remainingCents = bountyAmountCents - platformCents;

  // Split remaining 80% equally between claimer and sharer
  const claimerCents = Math.floor(remainingCents / 2);
  const sharerCents = remainingCents - claimerCents; // Sharer gets any remainder

  return {
    totalCents: bountyAmountCents,
    platformCents,
    claimerCents,
    sharerCents,
  };
}

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Format cents as currency string
 */
export function formatCentsAsCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
