export const INVITE_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;

export const INVITE_TYPE = {
  ADMIN: "ADMIN",
  USER_REFERRAL: "USER_REFERRAL",
  ORG_LEADER: "ORG_LEADER",
  SYSTEM_INVITE: "system_invite",
} as const;

export const INVITE_CONSTANTS = {
  VIRTUAL_ID: "0",
} as const;

export const VERIFICATION_TYPE = {
  EMAIL_MATCH: "email_match",
} as const;

export const VERIFICATION_STATUS = {
  PASSED: "passed",
  FAILED: "failed",
} as const;
