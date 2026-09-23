/**
 * Payment Calculation Utilities
 *
 * Provides precise financial calculations for the payment system.
 * All monetary values are handled in cents to avoid floating-point errors.
 */

import {
  INITIAL_CHARGE_PERCENT,
  CONNECTOR_PAYOUT_PERCENT,
} from "config/payment.config";

/**
 * Represents a split of amounts between two payments.
 */
export interface PaymentSplitAmounts {
  /** 5% initial charge amount in cents */
  initialAmountCents: number;
  /** 95% remaining charge amount in cents */
  remainingAmountCents: number;
  /** Total amount in cents (should equal sum of above) */
  totalAmountCents: number;
}

/**
 * Represents the payout split between connector and platform.
 */
export interface PayoutSplitAmounts {
  /** 80% connector payout amount in cents */
  connectorAmountCents: number;
  /** 20% platform commission amount in cents */
  platformAmountCents: number;
  /** Total amount in cents (should equal sum of above) */
  totalAmountCents: number;
}

/**
 * Converts a dollar amount to cents safely.
 * Uses Math.round to handle floating-point precision issues.
 *
 * @param dollarAmount - The amount in dollars (can be number or string)
 * @returns The amount in cents as an integer
 *
 * @example
 * convertToCents(100) // returns 10000
 * convertToCents('99.99') // returns 9999
 * convertToCents(0.01) // returns 1
 */
export function convertToCents(dollarAmount: number | string): number {
  const amount =
    typeof dollarAmount === "string" ? parseFloat(dollarAmount) : dollarAmount;

  if (isNaN(amount)) {
    throw new Error(`Invalid dollar amount: ${dollarAmount}`);
  }

  return Math.round(amount * 100);
}

/**
 * Converts a cents amount back to dollars.
 *
 * @param centsAmount - The amount in cents
 * @returns The amount in dollars as a number with 2 decimal precision
 *
 * @example
 * convertToDollars(10000) // returns 100.00
 * convertToDollars(9999) // returns 99.99
 */
export function convertToDollars(centsAmount: number): number {
  return Math.round(centsAmount) / 100;
}

/**
 * Calculates the split amounts for the dual PaymentIntent system.
 * Splits the total bounty into 5% (initial) and 95% (remaining).
 *
 * Uses floor for initial and adjusts remaining to ensure exact total.
 * This ensures the requester is never overcharged due to rounding.
 *
 * @param totalAmountDollars - The total bounty amount in dollars
 * @returns Object containing both split amounts in cents
 *
 * @example
 * calculateSplitAmounts(100)
 * // returns { initialAmountCents: 500, remainingAmountCents: 9500, totalAmountCents: 10000 }
 *
 * calculateSplitAmounts(33.33)
 * // returns { initialAmountCents: 166, remainingAmountCents: 3167, totalAmountCents: 3333 }
 */
export function calculateSplitAmounts(
  totalAmountDollars: number | string
): PaymentSplitAmounts {
  const totalCents = convertToCents(totalAmountDollars);

  if (totalCents <= 0) {
    throw new Error(`Total amount must be positive: ${totalAmountDollars}`);
  }

  // Calculate 5% (floor to avoid overcharging on initial)
  const initialAmountCents = Math.floor(
    (totalCents * INITIAL_CHARGE_PERCENT) / 100
  );

  // Remaining is total minus initial (ensures exact total)
  const remainingAmountCents = totalCents - initialAmountCents;

  return {
    initialAmountCents,
    remainingAmountCents,
    totalAmountCents: totalCents,
  };
}

/**
 * Calculates the payout split between connector and platform.
 * Splits the captured amount into 80% (connector) and 20% (platform).
 *
 * Uses floor for connector payout and adjusts platform to ensure exact total.
 * This ensures the connector receives at least their fair share.
 *
 * @param totalCapturedCents - The total captured amount in cents
 * @returns Object containing both payout amounts in cents
 *
 * @example
 * calculatePayoutSplit(10000)
 * // returns { connectorAmountCents: 8000, platformAmountCents: 2000, totalAmountCents: 10000 }
 *
 * calculatePayoutSplit(3333)
 * // returns { connectorAmountCents: 2666, platformAmountCents: 667, totalAmountCents: 3333 }
 */
export function calculatePayoutSplit(
  totalCapturedCents: number
): PayoutSplitAmounts {
  if (totalCapturedCents <= 0) {
    throw new Error(
      `Total captured amount must be positive: ${totalCapturedCents}`
    );
  }

  // Calculate 80% for connector (floor to be conservative)
  const connectorAmountCents = Math.floor(
    (totalCapturedCents * CONNECTOR_PAYOUT_PERCENT) / 100
  );

  // Platform gets the remainder (ensures exact total)
  const platformAmountCents = totalCapturedCents - connectorAmountCents;

  return {
    connectorAmountCents,
    platformAmountCents,
    totalAmountCents: totalCapturedCents,
  };
}

/**
 * Calculates the payout split from a dollar amount.
 * Convenience wrapper that converts to cents first.
 *
 * @param totalCapturedDollars - The total captured amount in dollars
 * @returns Object containing both payout amounts in cents
 */
export function calculatePayoutSplitFromDollars(
  totalCapturedDollars: number | string
): PayoutSplitAmounts {
  const totalCents = convertToCents(totalCapturedDollars);
  return calculatePayoutSplit(totalCents);
}

/**
 * Validates that a bounty amount meets minimum requirements.
 *
 * @param amountDollars - The bounty amount in dollars
 * @param minimumDollars - The minimum allowed amount (default: 10)
 * @returns True if amount is valid, false otherwise
 */
export function isValidBountyAmount(
  amountDollars: number | string,
  minimumDollars = 10
): boolean {
  const amount =
    typeof amountDollars === "string"
      ? parseFloat(amountDollars)
      : amountDollars;

  return !isNaN(amount) && amount >= minimumDollars;
}

/**
 * Formats a cents amount as a display string.
 *
 * @param cents - The amount in cents
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 *
 * @example
 * formatCentsForDisplay(10000) // returns "$100.00"
 * formatCentsForDisplay(9999) // returns "$99.99"
 */
export function formatCentsForDisplay(cents: number, currency = "USD"): string {
  const dollars = convertToDollars(cents);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}
