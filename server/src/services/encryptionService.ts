import { ConfigService } from "@nestjs/config";
import crypto from "node:crypto";

const configService = new ConfigService();

/**
 * Encryption Service
 *
 * Provides AES-256-GCM encryption for sensitive contact data (emails, phone numbers, LinkedIn URLs).
 * Uses the same encryption algorithm as the Supabase edge function for compatibility.
 *
 * Security Features:
 * - AES-256-GCM authenticated encryption
 * - Random salt and IV for each encryption
 * - PBKDF2 key derivation with 100,000 iterations
 * - Base64 encoding for storage
 */

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const SALT_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 100000;
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get the encryption key from environment variable
 */
function getEncryptionKey(): string {
  const key = configService.get<string>("ENCRYPTION_KEY");
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  return key;
}

/**
 * Derive encryption key from master key using PBKDF2
 */
function deriveKey(masterKey: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      masterKey,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      "sha256",
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      }
    );
  });
}

/**
 * Encrypt plaintext data using AES-256-GCM
 *
 * Returns base64-encoded string containing: salt + iv + encrypted + authTag
 * Format: [salt(16) | iv(12) | ciphertext | authTag(16)]
 * This format matches the Supabase edge function and decryptContactEmail()
 *
 * @param plaintext - Data to encrypt
 * @returns Base64-encoded encrypted data
 */
export async function encryptData(plaintext: string): Promise<string> {
  if (!plaintext) return "";

  const masterKey = getEncryptionKey();

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive encryption key from master key
  const key = await deriveKey(masterKey, salt);

  // Create cipher and encrypt
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Get authentication tag (automatically appended by Web Crypto API, manually here)
  const authTag = cipher.getAuthTag();

  // Combine salt + iv + encrypted + authTag (matches Web Crypto format)
  const combined = Buffer.concat([salt, iv, encrypted, authTag]);

  // Return as base64
  return combined.toString("base64");
}

/**
 * Decrypt base64-encoded encrypted data
 * Format: [salt(16) | iv(12) | ciphertext | authTag(16)]
 *
 * @param encryptedData - Base64-encoded encrypted data
 * @returns Decrypted plaintext
 */
export async function decryptData(encryptedData: string): Promise<string> {
  if (!encryptedData) return "";

  const masterKey = getEncryptionKey();

  // Decode from base64
  const combined = Buffer.from(encryptedData, "base64");

  // Extract components: salt + iv + encrypted + authTag
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const encryptedWithTag = combined.subarray(SALT_LENGTH + IV_LENGTH);

  // Auth tag is the last 16 bytes
  const authTag = encryptedWithTag.subarray(
    encryptedWithTag.length - AUTH_TAG_LENGTH
  );
  const encrypted = encryptedWithTag.subarray(
    0,
    encryptedWithTag.length - AUTH_TAG_LENGTH
  );

  // Derive decryption key
  const key = await deriveKey(masterKey, salt);

  // Create decipher and decrypt
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

/**
 * Mask email address for display purposes
 * Example: john.doe@example.com -> j***e@****.com
 *
 * @param email - Email address to mask
 * @returns Masked email address
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "";

  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) return "";

  // Mask local part
  let maskedLocal: string;
  if (localPart.length <= 2) {
    const [firstChar] = localPart;
    maskedLocal = `${firstChar}***`;
  } else {
    const [firstChar] = localPart;
    const lastChar = localPart[localPart.length - 1];
    maskedLocal = `${firstChar}***${lastChar}`;
  }

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
 * Mask phone number for display purposes
 * Stores plain digits only (no country codes, no dashes)
 * Shows asterisks for all digits except last 2 based on phone number length
 * Example: +1234567890 (10 digits) -> ********90
 * Example: +91-9876543210 (12 digits) -> **********10
 * Example: 5551234 (7 digits) -> *****34
 *
 * @param phone - Phone number to mask
 * @returns Masked phone number (plain digits only with asterisks)
 */
export function maskPhone(phone: string): string {
  if (!phone) return "";

  // Remove all non-digit characters to get plain digits only
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 2) {
    return "***";
  }

  // Show asterisks for all digits except last 2
  const lastTwo = digits.slice(-2);
  const asteriskCount = digits.length - 2;
  const asterisks = "*".repeat(asteriskCount);

  return `${asterisks}${lastTwo}`;
}

/**
 * Encrypt multiple fields in a contact object
 *
 * @param contact - Contact object with fields to encrypt
 * @returns Object with encrypted fields
 */
export async function encryptContactFields(contact: {
  email?: string;
  phone_number?: string;
  linkedin?: string;
  secondary_email?: string;
}): Promise<{
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  secondaryEmail: string | null;
}> {
  const [email, phone, linkedin, secondaryEmail] = await Promise.all([
    contact.email ? encryptData(contact.email) : null,
    contact.phone_number ? encryptData(contact.phone_number) : null,
    contact.linkedin ? encryptData(contact.linkedin) : null,
    contact.secondary_email ? encryptData(contact.secondary_email) : null,
  ]);

  return {
    email: email || null,
    phone: phone || null,
    linkedin: linkedin || null,
    secondaryEmail: secondaryEmail || null,
  };
}
