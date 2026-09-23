import { apiRequest } from "@/lib/api";
import { isValidPhoneNumber } from "libphonenumber-js";

export interface ContactAuditLog {
  contactId: number;
  action: "read" | "update" | "delete" | "export";
  fields?: string[];
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log contact access for audit purposes
 */
export async function logContactAccess({
  contactId,
  action,
  fields,
  ipAddress,
  userAgent,
}: ContactAuditLog) {
  try {
    // Use centralized API request which includes proactive token refresh
    await apiRequest("/audit/contact-access", {
      method: "POST",
      body: JSON.stringify({
        contactId,
        action,
        fields: fields || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || navigator.userAgent,
      }),
    });
  } catch {
    // Error is silently handled - audit logging failures should not break the app
  }
}

/**
 * Mask sensitive contact data based on field type
 */
export function maskSensitiveData(
  data: string | null | undefined,
  fieldType: "email" | "phone" | "linkedin" | "other"
): string {
  if (!data) return "";

  switch (fieldType) {
    case "email": {
      const [localPart, domain] = data.split("@");
      if (!domain) return data;
      return localPart.charAt(0) + "***@" + domain;
    }

    case "phone": {
      const cleaned = data.replace(/\D/g, "");
      if (cleaned.length < 2) return "***";
      return "***-***-**" + cleaned.slice(-2);
    }

    case "linkedin":
      return data.replace(/\/in\/[^/]+/, "/in/***");

    default:
      if (data.length <= 4) return "*".repeat(data.length);
      return (
        data.slice(0, 2) +
        "*".repeat(Math.max(data.length - 4, 1)) +
        data.slice(-2)
      );
  }
}

/**
 * Sanitize input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format using libphonenumber-js
 * Matches backend IsPhoneNumber decorator behavior (validates any region)
 * Uses the same library as backend class-validator IsPhoneNumber decorator
 */
export function isValidPhone(phone: string): boolean {
  try {
    // isValidPhoneNumber from libphonenumber-js validates phone numbers
    // Passing undefined as second parameter matches backend IsPhoneNumber(undefined, ...) behavior
    // which validates phone numbers for any region
    return isValidPhoneNumber(phone, undefined);
  } catch {
    // If parsing fails, the phone number is invalid
    return false;
  }
}

import { toUTC } from "@/lib/dayjs";

/**
 * Rate limiting utility for sensitive operations
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = toUTC().valueOf();
    const windowStart = now - windowMs;

    let timestamps = this.requests.get(key) || [];
    timestamps = timestamps.filter((time) => time > windowStart);

    if (timestamps.length >= maxRequests) {
      return false;
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);
    return true;
  }
}

export const contactAccessLimiter = new RateLimiter();

/**
 * Check if user has exceeded contact access rate limit
 */
export function checkContactAccessLimit(userId: string): boolean {
  return contactAccessLimiter.isAllowed(userId, 100, 60 * 60 * 1000);
}

/**
 * Validate profile photo URL - check for empty strings, whitespace-only strings, and basic URL format
 * @param url - The URL to validate (can be string, null, or undefined)
 * @returns true if the URL is a valid HTTP/HTTPS URL, false otherwise
 */
export function isValidPhotoUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed === "") return false;
  // Check if it's a valid URL (starts with http:// or https://)
  try {
    const urlObj = new URL(trimmed);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    // If URL constructor fails, it's not a valid URL
    return false;
  }
}
