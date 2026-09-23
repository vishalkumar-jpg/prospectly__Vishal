/** Salary periods a recruiter can pick for a job's salary range. */
export const VALID_SALARY_PERIODS = ["yearly", "monthly", "weekly", "hourly"];

/**
 * Maximum referral fee Stripe accepts in dollars (Stripe caps a single
 * PaymentIntent at 999,999.99 in the account currency).
 */
export const STRIPE_MAX_BOUNTY_DOLLARS = 999999;
