/**
 * Utility functions for masking sensitive data (email, phone)
 * Used for displaying in lists without requiring decryption
 */

/**
 * Masks an email address for display
 * Examples:
 *   john.doe@example.com → j***@****.com
 *   a@webelight.co.in → a***@****.co.in
 *   admin@test.com → a***@****.com
 */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== "string") {
    return null;
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail.includes("@")) {
    return null;
  }

  const [localPart, domain] = trimmedEmail.split("@");

  if (!localPart || !domain) {
    return null;
  }

  // Show only first character of local part
  const maskedLocal = localPart.charAt(0) + "***";

  // Extract TLD (everything after first dot to preserve multi-part TLDs like .co.in)
  const firstDotIndex = domain.indexOf(".");
  let maskedDomain: string;

  if (firstDotIndex === -1) {
    // No TLD found, mask entire domain
    maskedDomain = "****";
  } else {
    // Extract TLD and mask domain part
    const tld = domain.substring(firstDotIndex);
    maskedDomain = `****${tld}`;
  }

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Masks a phone number for display
 * Examples:
 *   +1-555-0100 → +1 ***-***-**00
 *   (555) 123-4567 → ***-***-**67
 *   5551234567 → ***-***-**67
 *   +91 9876543210 → +91 ***-***-**10
 */
export function maskPhoneNumber(
  phone: string | null | undefined
): string | null {
  if (!phone || typeof phone !== "string") {
    return null;
  }

  const trimmedPhone = phone.trim();

  // Remove all non-digit characters to get raw digits
  const digits = trimmedPhone.replace(/\D/g, "");

  if (digits.length < 2) {
    return "***";
  }

  // Extract country code if present (starts with +)
  const hasPlus = trimmedPhone.startsWith("+");
  let countryCode = "";

  if (hasPlus) {
    // Try to extract country code (1-3 digits after +)
    const match = trimmedPhone.match(/^\+(\d{1,3})/);
    if (match) {
      countryCode = `+${match[1]} `;
    }
  }

  // Show only last 2 digits
  const lastTwo = digits.slice(-2);

  return `${countryCode}***-***-**${lastTwo}`;
}

/**
 * Validates if a string is a valid email format
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates if a string is a valid phone number format
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone || typeof phone !== "string") {
    return false;
  }

  // Phone must have at least 7 digits
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7;
}
