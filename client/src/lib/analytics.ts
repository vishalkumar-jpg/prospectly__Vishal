import { logRocketService } from "./logrocket";

/**
 * LogRocket Analytics Event Tracking
 *
 * Centralized event constants and typed tracking methods.
 * All functions call logRocketService.track() which already guards
 * against disabled/uninitialized state.
 */

export const EVENT_NAMES = {
  BETA_LOGIN_SUCCESS: "Beta Login Success",
  ACTIVE_USAGE_PING: "Active Usage Ping",
  CONTACTS_UPLOADED: "Contacts Uploaded",
  INTRO_REQUESTED: "Intro Requested",
  INTRO_MADE: "Intro Made",
  FEATURE_VIEWED: "Feature Viewed",
  PROSPECT_SEARCHED: "Prospect Searched",
} as const;

// Dedupe: prevents double-fires from retries/re-renders
const firedEvents = new Set<string>();

function dedupeKey(eventName: string, uniqueId: string): string {
  return `${eventName}::${uniqueId}`;
}

function trackOnce(
  eventName: string,
  uniqueId: string,
  properties: Record<string, string | number | boolean>
): void {
  const key = dedupeKey(eventName, uniqueId);
  if (firedEvents.has(key)) return;
  firedEvents.add(key);
  logRocketService.track(eventName, properties);
}

// Throttle state for Active Usage Ping
let lastPingTimestamp = 0;
const PING_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

export const analytics = {
  trackBetaLoginSuccess(props: {
    method: string;
    inviteId: string;
    accountId: string;
  }): void {
    logRocketService.track(EVENT_NAMES.BETA_LOGIN_SUCCESS, props);
  },

  trackActiveUsagePing(props: {
    route: string;
    interactionType: string;
  }): void {
    const now = Date.now();
    if (now - lastPingTimestamp < PING_THROTTLE_MS) return;
    lastPingTimestamp = now;
    logRocketService.track(EVENT_NAMES.ACTIVE_USAGE_PING, props);
  },

  trackContactsUploaded(props: {
    source: string;
    countImported: number;
    countFailed: number;
    durationMs: number;
  }): void {
    trackOnce(
      EVENT_NAMES.CONTACTS_UPLOADED,
      `${props.source}-${props.countImported}-${Date.now()}`,
      props
    );
  },

  trackIntroRequested(props: {
    bountyId: string;
    requestType: string;
    targetType: string;
    hasReward: boolean;
  }): void {
    trackOnce(EVENT_NAMES.INTRO_REQUESTED, props.bountyId, props);
  },

  trackIntroMade(props: {
    bountyId: string;
    payoutStatus: string;
    payoutAmount: number;
    currency: string;
  }): void {
    trackOnce(EVENT_NAMES.INTRO_MADE, props.bountyId, props);
  },

  trackFeatureViewed(props: {
    feature: string;
    route: string;
    entryPoint: string;
  }): void {
    logRocketService.track(EVENT_NAMES.FEATURE_VIEWED, props);
  },

  trackProspectSearch(props: {
    searchType: "linkedin" | "profile";
    hasLinkedinUrl: boolean;
    hasName: boolean;
    hasEmail: boolean;
    hasCompany: boolean;
    hasWebsite: boolean;
    hasLocation: boolean;
    resultCount?: number;
  }): void {
    logRocketService.track(EVENT_NAMES.PROSPECT_SEARCHED, props);
  },
};
