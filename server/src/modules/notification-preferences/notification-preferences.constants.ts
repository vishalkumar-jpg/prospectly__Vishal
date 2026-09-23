export const NOTIFICATION_CATEGORY_KEYS = {
  JOB_OPPORTUNITIES: "job_opportunities",
  PIPELINE_UPDATES: "pipeline_updates",
  INTRO_ACTIVITY: "intro_activity",
  PROSPECT_PIPELINE_UPDATES: "prospect_pipeline_updates",
  SUBSCRIPTION: "subscription",
  PAYOUTS: "payouts",
  PRODUCT_REMINDERS: "product_reminders",
  ACCOUNT_SECURITY: "account_security",
} as const;

export type NotificationCategoryKey =
  (typeof NOTIFICATION_CATEGORY_KEYS)[keyof typeof NOTIFICATION_CATEGORY_KEYS];

export const SUPPRESSION_REASONS = {
  UNSUBSCRIBED: "unsubscribed",
  HARD_BOUNCE: "hard_bounce",
  COMPLAINT: "complaint",
  MANUAL: "manual",
} as const;

export const SUPPRESSION_SOURCES = {
  LINK: "link",
  PROVIDER_WEBHOOK: "provider_webhook",
  ADMIN: "admin",
} as const;

export const NOTIFICATION_GROUP_LABELS: Record<string, string> = {
  getting_started: "Getting started",
  recruitment: "Recruitment",
  prospect: "Prospect",
  billing: "Billing & payouts",
  required: "Required",
};

export const NOTIFICATION_CATEGORY_SEED = [
  {
    key: NOTIFICATION_CATEGORY_KEYS.JOB_OPPORTUNITIES,
    name: "New job opportunities",
    description: "Get notified when new jobs are posted for your organization.",
    groupKey: "recruitment",
    isMandatory: false,
    sortOrder: 1,
  },
  {
    key: NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
    name: "Recruitment pipeline updates",
    description:
      "Updates when a candidate is shortlisted, interviewed, hired, or declined.",
    groupKey: "recruitment",
    isMandatory: false,
    sortOrder: 2,
  },
  {
    key: NOTIFICATION_CATEGORY_KEYS.INTRO_ACTIVITY,
    name: "Introduction activity",
    description:
      "When someone asks for an intro, when you send one, or when feedback is needed.",
    groupKey: "prospect",
    isMandatory: false,
    sortOrder: 3,
  },
  {
    key: NOTIFICATION_CATEGORY_KEYS.PROSPECT_PIPELINE_UPDATES,
    name: "Prospect pipeline updates",
    description:
      "When a prospect books a meeting or you get a meeting confirmation.",
    groupKey: "prospect",
    isMandatory: false,
    sortOrder: 4,
  },
  {
    key: NOTIFICATION_CATEGORY_KEYS.SUBSCRIPTION,
    name: "Subscription & billing",
    description:
      "Receipts and updates about your subscription plan or billing.",
    groupKey: "billing",
    isMandatory: false,
    sortOrder: 5,
  },
  {
    key: NOTIFICATION_CATEGORY_KEYS.PAYOUTS,
    name: "Payout notifications",
    description: "When a referral payout is started or sent to you.",
    groupKey: "billing",
    isMandatory: false,
    sortOrder: 6,
  },
  {
    key: NOTIFICATION_CATEGORY_KEYS.PRODUCT_REMINDERS,
    name: "Product reminders",
    description: "Helpful reminders to finish setting up your account.",
    groupKey: "getting_started",
    isMandatory: false,
    sortOrder: 7,
  },
  {
    key: NOTIFICATION_CATEGORY_KEYS.ACCOUNT_SECURITY,
    name: "Account & security",
    description: "Important emails about your account, login, and invitations.",
    groupKey: "required",
    isMandatory: true,
    sortOrder: 8,
  },
] as const;

export const NOTIFICATION_PREFERENCES_MESSAGES = {
  ERROR: {
    INVALID_TOKEN: "Invalid or expired unsubscribe link",
    MANDATORY_CATEGORY: "This notification category cannot be disabled",
    CATEGORY_NOT_FOUND: "Notification category not found",
  },
} as const;
