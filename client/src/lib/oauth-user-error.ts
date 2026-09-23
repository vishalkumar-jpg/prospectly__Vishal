const STALE_CODE_MESSAGE =
  "This sign-in link is no longer valid. It was already used or timed out. Go back to Getting started and connect again.";

const GENERIC_CONNECT_MESSAGE =
  "Something went wrong while connecting your account. Please try again from Getting started.";

const MAX_RAW_MESSAGE_LENGTH = 200;

function looksLikeJsonErrorBlob(s: string): boolean {
  const t = s.trim();
  return t.startsWith("{") && t.includes('"error"');
}

function isStaleOrInvalidCodeError(lower: string): boolean {
  if (lower.includes("invalid_grant")) {
    return true;
  }
  if (lower.includes("aadsts70000")) {
    return true;
  }
  if (lower.includes("code has expired")) {
    return true;
  }
  if (
    lower.includes("code") &&
    lower.includes("not valid") &&
    lower.includes("parameter")
  ) {
    return true;
  }
  return false;
}

function parseJsonForStaleCode(raw: string): boolean {
  const t = raw.trim();
  if (!t.startsWith("{")) {
    return false;
  }
  try {
    const o = JSON.parse(t) as { error?: string; error_description?: string };
    const desc = (o.error_description || "").toLowerCase();
    const err = (o.error || "").toLowerCase();
    if (err === "invalid_grant" || desc.includes("invalid_grant")) {
      return true;
    }
    if (isStaleOrInvalidCodeError(desc)) {
      return true;
    }
  } catch {
    // substring may be embedded in a longer message
    const match = raw.match(/\{[\s\S]*"error"\s*:\s*"[^"]*"[\s\S]*\}/);
    if (match) {
      try {
        const o = JSON.parse(match[0]) as {
          error?: string;
          error_description?: string;
        };
        const blob = `${o.error || ""} ${o.error_description || ""}`.toLowerCase();
        return isStaleOrInvalidCodeError(blob);
      } catch {
        return false;
      }
    }
  }
  return false;
}

/**
 * Maps OAuth/token endpoint errors to short, user-facing copy.
 * Keeps technical details out of modals and toasts.
 */
export function getFriendlyOAuthErrorMessage(
  raw: string | undefined | null
): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return GENERIC_CONNECT_MESSAGE;
  }

  const lower = trimmed.toLowerCase();

  if (isStaleOrInvalidCodeError(lower) || parseJsonForStaleCode(trimmed)) {
    return STALE_CODE_MESSAGE;
  }

  if (looksLikeJsonErrorBlob(trimmed) || trimmed.length > MAX_RAW_MESSAGE_LENGTH) {
    return GENERIC_CONNECT_MESSAGE;
  }

  return trimmed;
}
