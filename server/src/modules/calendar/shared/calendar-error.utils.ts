/**
 * Translates raw calendar provider API errors into plain-language messages
 * that non-technical users can understand.
 *
 * The raw error string is always logged server-side for debugging. This
 * utility only affects the message surfaced to the end user.
 */

const SCOPE_PATTERNS = [
  "insufficient authentication scopes",
  "insufficient permission",
  "access not configured",
  "forbidden",
  "insufficientpermissions",
];

const TOKEN_EXPIRED_PATTERNS = [
  "token has been expired or revoked",
  "token has been revoked",
  "invalid_grant",
  "token expired",
];

const RATE_LIMIT_PATTERNS = [
  "rate limit",
  "quota exceeded",
  "too many requests",
  "user rate limit exceeded",
  "calendar usage limits",
];

const NOT_FOUND_PATTERNS = [
  "not found",
  "calendar not found",
  "resource not found",
];

function matchesAny(message: string, patterns: string[]): boolean {
  return patterns.some((p) => message.includes(p));
}

/**
 * Converts a raw calendar API error into a user-friendly message.
 *
 * @param rawMessage - The original error string from Google / Microsoft.
 * @param statusCode - HTTP status returned by the provider (optional hint).
 * @param provider  - "Google" or "Microsoft" for contextual wording.
 */
export function toUserFriendlyCalendarError(
  rawMessage: string,
  statusCode?: number,
  provider: "Google" | "Microsoft" = "Google"
): string {
  const lower = rawMessage.toLowerCase();

  // Rate limiting / quota — checked first because Google can return 403
  // for rate-limit errors, which would otherwise be caught by the
  // permission block below.
  if (matchesAny(lower, RATE_LIMIT_PATTERNS) || statusCode === 429) {
    return (
      `${provider} Calendar is temporarily limiting requests. ` +
      `Please wait a few minutes and try again.`
    );
  }

  // Insufficient scopes / permissions (403 from Google)
  if (matchesAny(lower, SCOPE_PATTERNS) || statusCode === 403) {
    return (
      `The connected ${provider} Calendar is missing required permissions. ` +
      `The calendar needs to be reconnected to grant the necessary access.`
    );
  }

  // Expired or revoked tokens (401)
  if (matchesAny(lower, TOKEN_EXPIRED_PATTERNS) || statusCode === 401) {
    return (
      `The ${provider} Calendar session has expired. ` +
      `The calendar needs to be reconnected to restore access.`
    );
  }

  // Resource not found
  if (matchesAny(lower, NOT_FOUND_PATTERNS) || statusCode === 404) {
    return (
      `The requested calendar or event could not be found. ` +
      `It may have been deleted, or the ${provider} Calendar connection may ` +
      `need to be refreshed.`
    );
  }

  // Generic fallback — still better than the raw API string
  return (
    `Something went wrong while accessing ${provider} Calendar. ` +
    `Please try again, or reconnect the calendar if the issue persists.`
  );
}
