export const MARKETPLACE_BOUNTY_SPLIT = 0.5;

export const GLOBAL_MARKETPLACE_MESSAGES = {
  INFO: {
    COUNT_RETRIEVED: "Marketplace opportunities count retrieved successfully",
  },
  ERROR: {
    FAILED_TO_COUNT: "Failed to retrieve marketplace opportunities count",
  },
};

export const MARKETPLACE_MESSAGES = {
  INFO: {
    REQUESTS_RETRIEVED: "Marketplace requests retrieved successfully",
    REQUEST_RETRIEVED: "Request details retrieved successfully",
    SHARE_CREATED: "Share link created successfully",
    SHARES_RETRIEVED: "User shares retrieved successfully",
    CLAIM_STARTED: "Claim process started. Please verify your connection.",
    CLAIM_VERIFIED:
      "Connection verified successfully. You can now complete the claim.",
    CLAIM_COMPLETED: "Claim completed successfully. Introduction accepted.",
    CLAIMS_RETRIEVED: "User claims retrieved successfully",
    EVENT_TRACKED: "Event tracked successfully",
    ANALYTICS_RETRIEVED: "Analytics retrieved successfully",
  },
  ERROR: {
    REQUEST_NOT_FOUND: "Introduction request not found or no longer available",
    SHARE_NOT_FOUND: "Share link not found or expired",
    CLAIM_NOT_FOUND: "Claim not found",
    CLAIM_NOT_VERIFIED: "Claim not verified or already completed",
    ALREADY_CLAIMED: "This introduction request has already been claimed",
    CANNOT_CLAIM_OWN: "You cannot claim your own introduction request",
    PROSPECT_NOT_IN_CONTACTS: "Prospect not found in your imported contacts",
    INVALID_CAPTCHA: "Invalid CAPTCHA verification",
    RATE_LIMIT_EXCEEDED: "Too many requests. Please try again later.",
    BOT_DETECTED: "Request blocked for security reasons",
    FAILED_TO_BROWSE: "Failed to retrieve marketplace requests",
    FAILED_TO_SHARE: "Failed to create share link",
    FAILED_TO_CLAIM: "Failed to process claim",
    FAILED_TO_TRACK: "Failed to track event",
  },
};

export const MARKETPLACE_RATE_LIMITS = {
  PUBLIC_REQUEST_VIEW: { limit: 100, windowMs: 60000 }, // 100/min
  CLAIM_START: { limit: 5, windowMs: 60000 }, // 5/min
  TRACK_EVENT: { limit: 60, windowMs: 60000 }, // 60/min
};

export const MARKETPLACE_PLATFORMS = [
  "linkedin",
  "twitter",
  "facebook",
  "copy",
] as const;

export type MarketplacePlatform = (typeof MARKETPLACE_PLATFORMS)[number];
