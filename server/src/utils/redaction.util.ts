const REDACTED = "[REDACTED]";

/**
 * Server-side PII redaction for AI summaries in early pipeline stages.
 * Mirrors the frontend redactSensitiveText function to ensure consistency.
 * Redacts URLs, emails, LinkedIn profiles, phone numbers, and social handles.
 */
export function redactSensitiveText(input: string): string {
  if (!input) return input;

  let out = input;

  // http(s) URLs
  out = out.replace(/\bhttps?:\/\/[^\s<>"')]+/gi, REDACTED);

  // Email
  out = out.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    REDACTED
  );

  // LinkedIn profile paths (often pasted without scheme)
  out = out.replace(
    /\b(?:www\.)?linkedin\.com\/(?:in|pub|company)\/[^\s]+/gi,
    REDACTED
  );

  // Generic bare-domain URLs (e.g., github.com/user)
  out = out.replace(
    /\b(?:www\.[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^\s<>"')]+)?|[A-Za-z0-9.-]+\.[A-Za-z]{2,}\/[^\s<>"')]+)\b/gi,
    REDACTED
  );

  // Phone-like: E.164 with + and country code, or US-style with area code grouping
  out = out.replace(
    /(?:\+1[-.\s]?\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}|\(?[2-9]\d{2}\)?[-.\s][2-9]\d{2}[-.\s]\d{4}|\+\d{1,3}(?:[-.\s]?\(?\d{1,4}\)?){2,4}|\b[2-9]\d{2}[2-9]\d{2}\d{4}\b)(?!\d)/g,
    REDACTED
  );

  // Obvious social handles (excluding scoped packages)
  out = out.replace(/(?<!\/|\w)@[A-Za-z0-9_]{2,}\b(?!\/)/g, REDACTED);

  return out;
}
