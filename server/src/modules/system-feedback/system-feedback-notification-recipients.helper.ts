import { FEEDBACK_NOTIFICATION_EMAILS_KEY } from "modules/system-configuration/system-configuration.constants";

export type FeedbackNotificationRecipients = {
  to: string[];
  bcc: string[];
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !EMAIL_REGEX.test(trimmed)) return null;
  return trimmed;
}

function normalizeEmailList(value: unknown): string[] {
  if (value == null) return [];

  if (typeof value === "string") {
    return value
      .split(/[,;\n]+/)
      .map((entry) => normalizeEmail(entry))
      .filter((email): email is string => email !== null);
  }

  if (!Array.isArray(value)) return [];

  return value
    .flatMap((entry) => {
      if (typeof entry === "string") return normalizeEmail(entry) ?? [];
      return [];
    })
    .filter((email): email is string => email !== null);
}

function parseRelaxedJsonString(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidates = [trimmed];
  if (!trimmed.startsWith("{") && trimmed.includes(":")) {
    candidates.push(`{${trimmed}}`);
  }

  for (const candidate of candidates) {
    const parsed = tryParseRelaxedObject(candidate);
    if (parsed !== null) return parsed;
  }

  return null;
}

function tryParseRelaxedObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    const normalized = value.replace(
      /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g,
      '$1"$2"$3'
    );
    try {
      const parsed = JSON.parse(normalized);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function parseObject(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    const parsed = parseRelaxedJsonString(value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
  }
  return null;
}

function hasRecipientKeys(block: Record<string, unknown>): boolean {
  return "to" in block || "bcc" in block;
}

function extractRecipientsBlock(
  root: Record<string, unknown>
): Record<string, unknown> | null {
  if (hasRecipientKeys(root)) return root;

  const nested = parseObject(root[FEEDBACK_NOTIFICATION_EMAILS_KEY]);
  if (nested && hasRecipientKeys(nested)) return nested;

  return null;
}

export function parseFeedbackNotificationRecipients(
  value: unknown
): FeedbackNotificationRecipients {
  const root = parseObject(value);
  if (!root) return { to: [], bcc: [] };

  const recipientsBlock = extractRecipientsBlock(root);
  if (!recipientsBlock) return { to: [], bcc: [] };

  return {
    to: normalizeEmailList(recipientsBlock.to),
    bcc: normalizeEmailList(recipientsBlock.bcc),
  };
}

export function hasFeedbackNotificationRecipients(
  recipients: FeedbackNotificationRecipients
): boolean {
  return recipients.to.length > 0 || recipients.bcc.length > 0;
}
