import type { InboxCandidate, InboxItem } from "./types";

/** Must match server CONNECTOR_UPLOAD_AUTO_CONSENT_MIN_SCORE. */
export const CONNECTOR_UPLOAD_AUTO_CONSENT_MIN_SCORE = 50;

/**
 * How long the board keeps a connector-upload Qualified (`pending`) card in
 * AI Analysis while auto-consent finishes. After this, show Qualified so
 * manual Refer still works if auto-send failed.
 */
export const CONNECTOR_UPLOAD_AUTO_CONSENT_UI_GRACE_MS = 20_000;

/** After an upload job is seen, keep attributing new pending matches to it. */
export const CONNECTOR_UPLOAD_SESSION_WINDOW_MS = 60_000;

/** Resume-upload path waiting for auto-consent (score qualifies → pending). */
export function isConnectorUploadAwaitingAutoConsent(
  item: InboxCandidate
): boolean {
  return (
    item.source === "connector_uploaded" &&
    item.status === "pending" &&
    item.matchScore >= CONNECTOR_UPLOAD_AUTO_CONSENT_MIN_SCORE
  );
}

/**
 * Track matches eligible for UI masking: seen as `processing`, or pending
 * while a resume-upload session is still active (covers fast polls that miss
 * the processing row). Prunes IDs that left the board or left the awaiting
 * window so the Set stays bounded for long-lived sessions.
 */
export function trackUploadAutoConsentSession(
  items: InboxItem[],
  seenProcessing: Set<string>,
  uploadSessionActiveUntil: { current: number },
  now = Date.now()
): void {
  const hasActiveUpload = items.some(
    (item) =>
      item.type === "upload_job" &&
      (item.status === "queued" || item.status === "processing")
  );
  if (hasActiveUpload) {
    uploadSessionActiveUntil.current = now + CONNECTOR_UPLOAD_SESSION_WINDOW_MS;
  }

  // IDs that should stay in seenProcessing this snapshot (processing or
  // still awaiting auto-consent). Everything else is pruned so the Set
  // cannot grow unbounded across a long-lived board session.
  const retain = new Set<string>();
  for (const item of items) {
    if (item.type !== "pool_match") continue;
    if (item.source !== "connector_uploaded") continue;
    if (item.status === "processing") {
      seenProcessing.add(item.matchId);
      retain.add(item.matchId);
    } else if (isConnectorUploadAwaitingAutoConsent(item)) {
      if (
        now < uploadSessionActiveUntil.current ||
        seenProcessing.has(item.matchId)
      ) {
        seenProcessing.add(item.matchId);
        retain.add(item.matchId);
      }
    }
  }
  for (const id of [...seenProcessing]) {
    if (!retain.has(id)) seenProcessing.delete(id);
  }
}

export function syncAutoConsentGraceMap(
  items: InboxItem[],
  graceMap: Map<string, number>,
  seenProcessing: Set<string>,
  now = Date.now()
): void {
  const active = new Set<string>();
  for (const item of items) {
    if (item.type !== "pool_match") continue;
    if (!isConnectorUploadAwaitingAutoConsent(item)) continue;
    if (!seenProcessing.has(item.matchId)) continue;
    active.add(item.matchId);
    if (!graceMap.has(item.matchId)) {
      graceMap.set(item.matchId, now);
    }
  }
  for (const id of graceMap.keys()) {
    if (!active.has(id)) graceMap.delete(id);
  }
}

/**
 * True while we should still mask as AI Analysis.
 * Only for connector_uploaded matches from this upload session, within grace.
 */
export function shouldMaskAsAiAnalysisForAutoConsent(
  item: InboxItem,
  graceMap: Map<string, number>,
  seenProcessing: Set<string>,
  now = Date.now()
): boolean {
  if (item.type !== "pool_match") return false;
  if (!isConnectorUploadAwaitingAutoConsent(item)) return false;
  if (!seenProcessing.has(item.matchId)) return false;
  const since = graceMap.get(item.matchId) ?? now;
  return now - since < CONNECTOR_UPLOAD_AUTO_CONSENT_UI_GRACE_MS;
}
