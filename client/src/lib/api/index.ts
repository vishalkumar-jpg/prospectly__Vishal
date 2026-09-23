/**
 * API Aggregation Module
 *
 * Re-exports all domain specific API modules into a unified API object.
 * This structure maintains backward compatibility with the original monolithic api.ts
 */

import { authApi } from "./auth";
import {
  introductionsApi,
  introductionPotentialConnectorsApi,
} from "./introductions";
import { contactsApi } from "./contacts";
import { calendarApi } from "./calendar";
import { meetingsApi } from "./meetings";
import { profilesApi } from "./profiles";
import { subscriptionsApi } from "./subscriptions";
import { paymentsApi, stripeApi, financesApi } from "./payments";
import { invitesApi } from "./invites";
import { referralsApi } from "./referrals";
import { privacyApi } from "./privacy";
import { dashboardApi } from "./dashboard";
import { linkedinApi } from "./linkedin";
import { trustScoreApi, feedbackApi } from "./trustScore";
import { creditsApi } from "./credits";
import {
  emailsApi,
  systemFeedbackApi,
  archiveApi,
  presignedApi,
  systemConfigurationApi,
} from "./misc";
import { marketplaceApi } from "./marketplace";
import { recruitmentApi } from "./recruitment";
import { recruitmentSpendingApi } from "./recruitment-spending";
import { gettingStartedApi } from "./getting-started";
import { moduleAccessApi } from "./module-access";
import { notificationPreferencesApi } from "./notification-preferences";

// Re-export core utilities
export {
  API_BASE_URL,
  apiRequestForQuery,
  ApiError,
  setTokenExpiration,
  clearTokenExpiration,
} from "./core";
export { request as apiRequest } from "./core";
/**
 * API client object with all endpoint methods
 */
export const api = {
  // Authentication
  auth: authApi,

  // Introduction Requests
  introductions: introductionsApi,

  // Introduction Potential Connectors
  introductionPotentialConnectors: introductionPotentialConnectorsApi,

  // Payments
  payments: paymentsApi,

  // Emails
  emails: emailsApi,

  // Contacts
  contacts: contactsApi,

  // Calendar
  calendar: calendarApi,

  // Meetings
  meetings: meetingsApi,

  // System Feedback
  systemFeedback: systemFeedbackApi,

  // Profiles
  profiles: profilesApi,

  // Archive
  archive: archiveApi,

  // Subscriptions
  subscriptions: subscriptionsApi,

  // Invites
  invites: invitesApi,

  // Referrals
  referrals: referralsApi,

  // Stripe
  stripe: stripeApi,

  // Finances
  finances: financesApi,

  // Privacy
  privacy: privacyApi,

  // Dashboard
  dashboard: dashboardApi,

  // LinkedIn
  linkedin: linkedinApi,

  // Trust Score
  trustScore: trustScoreApi,

  // Feedback
  feedback: feedbackApi,

  // Presigned
  presigned: presignedApi,

  // System configuration (e.g. conference_link)
  systemConfiguration: systemConfigurationApi,

  // Credits
  credits: creditsApi,

  // Marketplace
  marketplace: marketplaceApi,

  // Recruitment
  recruitment: recruitmentApi,

  // Recruitment Spending
  recruitmentSpending: recruitmentSpendingApi,

  // Getting started onboarding progress
  gettingStarted: gettingStartedApi,

  // Org module access / config
  moduleAccess: moduleAccessApi,

  notificationPreferences: notificationPreferencesApi,
};

export default api;
