export const SUBSCRIPTIONS_MESSAGES = {
  INFO: {
    FETCHING_PLANS: "Fetching subscription plans",
  },
  ERROR: {
    PLANS_NOT_FOUND: "No subscription plans found",
    FAILED_TO_FETCH_PLANS: "Failed to fetch subscription plans",
  },
};

export const SUBSCRIPTION_INTERVAL = {
  MONTH: "month",
  YEAR: "year",
} as const;

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
  UNPAID: "unpaid",
  INCOMPLETE: "incomplete",
  INCOMPLETE_EXPIRED: "incomplete_expired",
  TRIALING: "trialing",
} as const;
