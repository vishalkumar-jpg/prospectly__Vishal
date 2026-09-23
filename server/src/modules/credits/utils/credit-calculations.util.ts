/**
 * Credit Calculation Utilities
 *
 * Functions for calculating credit applications during payouts.
 */

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
  return Math.round(cents) / 100;
}

/**
 * Calculate how many credits to apply to a payout
 * Credits can only offset up to the commission amount
 *
 * @param creditBalance - User's current credit balance in dollars
 * @param commissionAmountCents - Platform commission in cents
 * @returns Object with credits to apply and resulting amounts
 */
export function calculateCreditApplication(
  creditBalance: number,
  commissionAmountCents: number
): {
  creditsToApply: number;
  creditsToApplyCents: number;
  effectiveCommissionCents: number;
  connectorBonusCents: number;
} {
  const creditBalanceCents = dollarsToCents(creditBalance);

  // Credits can only offset up to the commission amount
  const creditsToApplyCents = Math.min(
    creditBalanceCents,
    commissionAmountCents
  );
  const creditsToApply = centsToDollars(creditsToApplyCents);

  // Calculate effective commission after credit offset
  const effectiveCommissionCents = commissionAmountCents - creditsToApplyCents;

  // The bonus that goes to the connector is equal to credits applied
  const connectorBonusCents = creditsToApplyCents;

  return {
    creditsToApply,
    creditsToApplyCents,
    effectiveCommissionCents,
    connectorBonusCents,
  };
}

/**
 * Format credit amount for display
 */
export function formatCredits(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
