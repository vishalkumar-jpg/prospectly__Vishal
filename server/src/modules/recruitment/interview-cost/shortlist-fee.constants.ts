/**
 * Shortlist Fee Constants
 *
 * Fee structure for recruitment shortlist payment authorization.
 * Recruiter pays ALL fees (platform bears zero Stripe cost).
 */

/** Stripe percentage fee (2.9%) */
export const STRIPE_PERCENTAGE_FEE = 2.9;

/** Stripe fixed fee in cents ($0.30) */
export const STRIPE_FIXED_FEE_CENTS = 30;

/** Processing fee in dollars ($0.25 flat) */
export const PROCESSING_FEE_DOLLARS = 0.25;

export const SHORTLIST_FEE_MESSAGES = {
  ERROR: {
    INVALID_BOUNTY: "Invalid referral payout amount",
    CANDIDATE_NOT_FOUND: "Candidate not found",
    NOT_JOB_OWNER: "You are not authorized to view this breakdown",
  },
} as const;
