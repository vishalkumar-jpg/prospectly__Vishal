/**
 * Pure URL redaction for Google Analytics.
 *
 * Several public routes carry single-use secrets directly in the path
 * (booking tokens, consent tokens, sharer codes). GA4 transmits the full URL
 * unless it is overridden, so every path and query string is scrubbed here
 * before it leaves the browser.
 *
 * The rules are deliberately generic rather than a copy of the route table:
 * a tokenized route added later is redacted automatically, without anyone
 * having to remember to register it.
 *
 * No I/O — everything in this file is a pure function.
 */

export const ID_PLACEHOLDER = ":id";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIGITS_ONLY_PATTERN = /^\d+$/;
const NO_SEPARATOR_PATTERN = /^[A-Za-z0-9]+$/;
const TOKEN_CHARS_PATTERN = /^[A-Za-z0-9._~-]+$/;
const LETTER_PATTERN = /[A-Za-z]/;
const DIGIT_PATTERN = /\d/;
const SEPARATOR_PATTERN = /[-_.]/;

/** Segment lengths above which a value stops looking like a route word. */
const SHORT_CODE_MIN_LENGTH = 6;
const MIXED_TOKEN_MIN_LENGTH = 16;
const LONG_OPAQUE_MIN_LENGTH = 20;

/** Query params kept for marketing attribution. Everything else is dropped. */
const ALLOWED_QUERY_PARAMS = new Set([
  "gclid",
  "gbraid",
  "wbraid",
  "msclkid",
]);
const ALLOWED_QUERY_PREFIX = "utm_";

/**
 * True when a separator-free run of characters looks randomly generated:
 * long enough to be a code, and mixing letters with digits.
 */
function isOpaqueRun(part: string): boolean {
  return (
    part.length >= SHORT_CODE_MIN_LENGTH &&
    NO_SEPARATOR_PATTERN.test(part) &&
    LETTER_PATTERN.test(part) &&
    DIGIT_PATTERN.test(part)
  );
}

/**
 * True when a path segment looks like an identifier or a secret rather than a
 * route word. Errs towards redacting: a false positive costs report detail,
 * a false negative leaks a token to a third party.
 */
export function isOpaqueSegment(segment: string): boolean {
  if (!segment) {
    return false;
  }

  if (UUID_PATTERN.test(segment) || DIGITS_ONLY_PATTERN.test(segment)) {
    return true;
  }

  // JWTs and other dotted tokens, e.g. "eyJhbGciOiJIUzI1NiIs.…"
  if (
    segment.length >= LONG_OPAQUE_MIN_LENGTH &&
    segment.includes(".") &&
    TOKEN_CHARS_PATTERN.test(segment)
  ) {
    return true;
  }

  // Any separator-delimited part that is itself a mixed alphanumeric run of
  // 6+ characters, e.g. "Xy91Zq" in "bkng_Xy91Zq" or "abc123xyz789" in
  // "tok_abc123xyz789". Route words that contain digits ("step-1") split into
  // parts that are purely alphabetic or purely numeric, so they are not caught.
  if (segment.split(SEPARATOR_PATTERN).some(isOpaqueRun)) {
    return true;
  }

  // Longer token that may carry separators, e.g. "session-9f8e-7d6c-aa".
  if (
    LETTER_PATTERN.test(segment) &&
    DIGIT_PATTERN.test(segment) &&
    segment.length >= MIXED_TOKEN_MIN_LENGTH
  ) {
    return true;
  }

  // Long separator-free value with no digits, e.g. a hex hash.
  if (
    segment.length >= LONG_OPAQUE_MIN_LENGTH &&
    NO_SEPARATOR_PATTERN.test(segment)
  ) {
    return true;
  }

  return false;
}

/**
 * Replaces identifier-looking segments with `:id`.
 *
 * "/book-meeting/91/tok_abc123xyz789" -> "/book-meeting/:id/:id"
 * "/how-it-works"                     -> "/how-it-works"
 */
export function redactPath(pathname: string): string {
  if (!pathname) {
    return "/";
  }

  const redacted = pathname
    .split("/")
    .map((segment) => (isOpaqueSegment(segment) ? ID_PLACEHOLDER : segment))
    .join("/");

  return redacted || "/";
}

/**
 * Keeps only marketing attribution params. Invite codes, sharer codes, tab
 * state and any future param are dropped.
 *
 * "?invite=xyz&utm_source=email" -> "?utm_source=email"
 */
export function redactSearch(search: string): string {
  if (!search) {
    return "";
  }

  const kept = new URLSearchParams();

  new URLSearchParams(search).forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (
      normalized.startsWith(ALLOWED_QUERY_PREFIX) ||
      ALLOWED_QUERY_PARAMS.has(normalized)
    ) {
      kept.append(key, value);
    }
  });

  const query = kept.toString();
  return query ? `?${query}` : "";
}

/**
 * Redacts same-origin referrers. Cross-origin referrers pass through: they are
 * the acquisition signal and contain none of our secrets.
 */
export function redactReferrer(referrer: string, origin: string): string {
  if (!referrer) {
    return "";
  }

  try {
    const url = new URL(referrer);
    if (url.origin !== origin) {
      return referrer;
    }
    return `${url.origin}${redactPath(url.pathname)}${redactSearch(url.search)}`;
  } catch {
    return "";
  }
}
