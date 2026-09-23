import sanitizeHtml from "sanitize-html";

/**
 * Tight sanitizer for recruitment rich-text fields (description, requirements,
 * responsibilities, benefits). These are rendered on PUBLIC candidate-facing
 * pages, so we allow only the basic formatting tags the editor produces and
 * strip all attributes, styles, and schemes.
 *
 * Deliberately stricter than `modules/emails/sanitizer.ts` (which permits
 * img/table/style for email templates).
 */
const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "ul",
    "ol",
    "li",
  ],
  allowedAttributes: {},
  allowedStyles: {},
  allowedSchemes: [],
  disallowedTagsMode: "discard",
};

export function sanitizeRichText(value: string | null | undefined): string {
  if (!value) return "";
  return sanitizeHtml(value, RICH_TEXT_OPTIONS);
}

/** Apply `sanitizeRichText` to a value only when it is a non-empty string. */
export function sanitizeRichTextOptional(
  value: string | null | undefined
): string | undefined {
  if (value === undefined || value === null) return undefined;
  return sanitizeRichText(value);
}
