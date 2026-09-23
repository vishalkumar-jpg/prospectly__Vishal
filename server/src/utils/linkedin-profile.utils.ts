import { normalizeLinkedIn } from "services/contactMatchingService";

/** Common AI / form-placeholder slugs — never persist or suggest these. */
const PLACEHOLDER_LINKEDIN_SLUGS = new Set([
  "username",
  "yourname",
  "your-name",
  "yourprofile",
  "your-profile",
  "profile",
  "name",
  "user",
  "me",
  "linkedin",
  "example",
  "test",
  "sample",
]);

/**
 * Normalize a LinkedIn string to a canonical profile URL.
 * Returns null when missing, unparseable, or a known placeholder.
 */
export function toCanonicalLinkedInProfileUrl(
  raw: string | null | undefined
): string | null {
  const slug = normalizeLinkedIn(raw?.trim() || null);
  if (!slug) return null;
  if (PLACEHOLDER_LINKEDIN_SLUGS.has(slug.toLowerCase())) return null;
  if (slug.length < 3) return null;
  return `https://www.linkedin.com/in/${slug}`;
}
