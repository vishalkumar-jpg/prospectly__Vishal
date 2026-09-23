/**
 * Domain Extraction Utility
 *
 * Provides functions to extract and normalize domains from emails and URLs
 * for privacy rule matching.
 */

/**
 * Extract domain from email address
 * @param email - Email address (e.g., "user@example.com")
 * @returns Domain string (e.g., "example.com") or null if invalid
 */
export function extractDomainFromEmail(
  email: string | undefined | null
): string | null {
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
 * Extract domain from URL
 * Handles various URL formats:
 * - https://example.com/path
 * - http://example.com
 * - example.com
 * - www.example.com
 *
 * @param url - URL string
 * @returns Domain string (e.g., "example.com") or null if invalid
 */
export function extractDomainFromUrl(
  url: string | undefined | null
): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  const trimmedUrl = url.trim();

  // If it's already a domain (no protocol), try to extract
  if (!trimmedUrl.includes("://")) {
    // Remove leading www. if present
    const domain = trimmedUrl.replace(/^www\./i, "");
    // Remove any trailing paths
    const [cleanDomain] = domain.split("/");
    // Normalize to lowercase for consistency with URL constructor behavior
    return cleanDomain ? cleanDomain.toLowerCase() : null;
  }

  try {
    // Parse as URL
    const urlObj = new URL(trimmedUrl);
    let { hostname } = urlObj;

    // Remove leading www. if present
    hostname = hostname.replace(/^www\./i, "");

    return hostname || null;
  } catch {
    // If URL parsing fails, try simple extraction
    // Remove protocol
    let cleaned = trimmedUrl.replace(/^https?:\/\//i, "");
    // Remove www.
    cleaned = cleaned.replace(/^www\./i, "");
    // Remove path and query
    const [domainWithoutPath] = cleaned.split("/");
    const [domainWithoutQuery] = domainWithoutPath.split("?");
    const [domain] = domainWithoutQuery.split("#");
    // Normalize to lowercase for consistency with URL constructor behavior
    return domain ? domain.toLowerCase() : null;
  }
}

/**
 * Normalize domain for comparison
 * - Convert to lowercase
 * - Trim whitespace
 *
 * @param domain - Domain string
 * @returns Normalized domain string
 */
export function normalizeDomain(
  domain: string | null | undefined
): string | null {
  if (!domain || typeof domain !== "string") {
    return null;
  }

  return domain.trim().toLowerCase() || null;
}

/**
 * Extract all domains for a user
 * Combines domains from email and website_url
 *
 * @param email - User email
 * @param websiteUrl - User website URL
 * @returns Array of normalized domains (may contain duplicates, caller should dedupe if needed)
 */
export function extractUserDomains(
  email: string | null | undefined,
  websiteUrl: string | null | undefined
): string[] {
  const domains: string[] = [];

  const emailDomain = normalizeDomain(extractDomainFromEmail(email));
  if (emailDomain) {
    domains.push(emailDomain);
  }

  const urlDomain = normalizeDomain(extractDomainFromUrl(websiteUrl));
  if (urlDomain) {
    domains.push(urlDomain);
  }

  return domains;
}
