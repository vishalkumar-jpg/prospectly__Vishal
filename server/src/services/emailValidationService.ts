/**
 * Email Validation Service
 *
 * Validates email addresses to detect disposable/temporary email domains.
 * Uses a comprehensive list of known disposable email domains.
 */

// Import disposable email domains list
// The package exports an array of domain strings as default export
import disposableEmailDomains from "disposable-email-domains";

// Handle both array and object exports
const disposableDomainsArray: string[] = Array.isArray(disposableEmailDomains)
  ? disposableEmailDomains
  : (disposableEmailDomains as { default?: string[] }).default || [];

// Convert array to Set for O(1) lookup performance
const disposableDomainsSet = new Set(
  disposableDomainsArray.map((domain) => domain.toLowerCase())
);

/**
 * Extract domain from email address
 * @param email - Email address (e.g., "user@example.com")
 * @returns Domain string (e.g., "example.com") or null if invalid
 */
function extractDomain(email: string | undefined | null): string | null {
  if (!email || typeof email !== "string") {
    return null;
  }

  const trimmedEmail = email.trim().toLowerCase();
  const atIndex = trimmedEmail.indexOf("@");

  if (atIndex === -1 || atIndex === 0 || atIndex === trimmedEmail.length - 1) {
    return null;
  }

  const domain = trimmedEmail.substring(atIndex + 1);
  return domain || null;
}

/**
 * Check if an email address belongs to a disposable/temporary email domain
 *
 * @param email - Email address to check
 * @returns true if email is disposable, false if valid or no email provided
 *
 * Behavior:
 * - Returns false if email is null/undefined/empty (contacts without emails are valid)
 * - Returns false if email format is invalid (let other validators handle format)
 * - Returns true if domain is in the disposable domains list
 * - Case-insensitive matching
 */
export async function isDisposableEmail(
  email: string | undefined | null
): Promise<boolean> {
  // Contacts without emails are valid (they can have phone numbers)
  if (!email || typeof email !== "string" || !email.trim()) {
    return false;
  }

  const domain = extractDomain(email);
  if (!domain) {
    // Invalid email format - don't treat as disposable, let format validators handle it
    return false;
  }

  // Check against disposable domains list (case-insensitive)
  return disposableDomainsSet.has(domain.toLowerCase());
}

/**
 * Filter out contacts with disposable email addresses
 *
 * @param contacts - Array of contacts to filter
 * @returns Object containing filtered contacts and count of filtered items
 */
export async function filterDisposableEmails<T extends { email?: string }>(
  contacts: T[]
): Promise<{ filtered: T[]; filteredCount: number }> {
  const filtered: T[] = [];
  let filteredCount = 0;

  for (const contact of contacts) {
    const isDisposable = await isDisposableEmail(contact.email);

    if (isDisposable) {
      filteredCount++;
      // Skip this contact - don't add to filtered array
      continue;
    }

    // Contact has no email or has valid email - include it
    filtered.push(contact);
  }

  return { filtered, filteredCount };
}
