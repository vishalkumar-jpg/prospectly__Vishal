/** URL slug ↔ internal tab id mappings for path-based tab routes. */

export const MY_PROSPECTS_TABS = {
  "open-request": "active",
  archive: "completed",
} as const;

export const MY_PROSPECTS_TAB_TO_SLUG = {
  active: "open-request",
  completed: "archive",
} as const;

export const INCOMING_REQUESTS_TABS = [
  "inbox",
  "pipeline",
  "archive",
  "unfulfilled",
] as const;

export const OPPORTUNITIES_TABS = ["browse", "shared", "claims"] as const;

export const PROSPECTING_FINANCE_TABS = {
  overview: "overview",
  transactions: "transactions",
  payouts: "payouts",
  payments: "payment-methods",
  disputes: "disputes",
} as const;

export const PROSPECTING_FINANCE_TAB_TO_SLUG = {
  overview: "overview",
  transactions: "transactions",
  payouts: "payouts",
  "payment-methods": "payments",
  disputes: "disputes",
} as const;

export const RECRUITING_FINANCE_TABS = {
  "connector-earnings": "connector",
  "requester-spending": "requester",
  "my-bonuses": "candidate",
} as const;

export const RECRUITING_FINANCE_TAB_TO_SLUG = {
  connector: "connector-earnings",
  requester: "requester-spending",
  candidate: "my-bonuses",
} as const;

export const MY_JOB_POSTS_TABS = ["active", "closed"] as const;

export const REFER_CANDIDATES_TABS = ["inbox", "closed"] as const;

export const MY_APPLICATIONS_TABS = ["all", "active", "completed"] as const;

export const MY_CONTACTS_TABS = ["all", "invited"] as const;

export const PROFILE_SECTION_TABS = {
  "user-profile": "profile",
  business: "business",
  organizations: "organizations",
  privacy: "privacy",
  subscriptions: "subscriptions",
  settings: "settings",
  "email-preferences": "preferences",
} as const;

export const PROFILE_SECTION_TO_SLUG = {
  profile: "user-profile",
  business: "business",
  organizations: "organizations",
  privacy: "privacy",
  subscriptions: "subscriptions",
  settings: "settings",
  preferences: "email-preferences",
} as const;

export const TAB_ROUTE_BASES = {
  myProspects: "/prospecting/my-prospects",
  incomingRequests: "/prospecting/incoming-requests",
  opportunities: "/prospecting/opportunities",
  prospectingTransactions: "/prospecting/transactions",
  recruitingTransactions: "/recruiting/transactions",
  myJobPosts: "/recruiting/my-job-posts",
  referCandidates: "/recruiting/refer-candidates",
  myApplications: "/recruiting/my-applications",
  myContacts: "/my-contacts",
  profile: "/profile",
} as const;
