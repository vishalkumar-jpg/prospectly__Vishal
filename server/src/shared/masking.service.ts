import { Injectable } from "@nestjs/common";

@Injectable()
export class MaskingService {
  maskEmail(email: string | null | undefined): string | null {
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

  maskPhoneNumber(phone: string | null | undefined): string | null {
    if (!phone || typeof phone !== "string") {
      return null;
    }

    const trimmedPhone = phone.trim();
    const digits = trimmedPhone.replace(/\D/g, "");

    if (digits.length < 2) {
      return "***";
    }

    const hasPlus = trimmedPhone.startsWith("+");
    let countryCode = "";

    if (hasPlus) {
      const match = trimmedPhone.match(/^\+(\d{1,3})/);
      if (match) {
        countryCode = `+${match[1]} `;
      }
    }

    // Show only last 2 digits
    const lastTwo = digits.slice(-2);

    return `${countryCode}***-***-**${lastTwo}`;
  }

  isValidEmail(email: string | null | undefined): boolean {
    if (!email || typeof email !== "string") {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  isValidPhoneNumber(phone: string | null | undefined): boolean {
    if (!phone || typeof phone !== "string") {
      return false;
    }

    const digits = phone.replace(/\D/g, "");
    return digits.length >= 7;
  }
}
