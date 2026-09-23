const REDACTED = "[redacted]";

/**
 * Best-effort PII redaction for display copy (e.g. AI summaries in early pipeline stages).
 * Does not remove person names in free text without NER; combine with extraction prompts that
 * discourage PII in summaries.
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

  // Phone-like: E.164 with + and country code, US-style with area code grouping, contiguous NANP
  out = out.replace(
    /(?:\+1[-.\s]?\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}|\(?[2-9]\d{2}\)?[-.\s][2-9]\d{2}[-.\s]\d{4}|\+\d{1,3}(?:[-.\s]?\(?\d{1,4}\)?){2,4}|\b[2-9]\d{2}[2-9]\d{2}\d{4}\b)(?!\d)/g,
    REDACTED
  );

  // Obvious social handles
  out = out.replace(/(?<!\w)@[A-Za-z0-9_]{2,}\b/g, REDACTED);

  return out;
}
