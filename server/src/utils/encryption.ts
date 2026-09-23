/**
 * @deprecated Use EncryptionService from 'shared/encryption.service' instead.
 * This file contains standalone encryption utilities that duplicate the service.
 * New code should inject EncryptionService rather than using these functions.
 */
import { ConfigService } from "@nestjs/config";
import crypto from "node:crypto";

const configService = new ConfigService();

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const _AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = configService.get<string>("ENCRYPTION_KEY");

  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  if (key.length !== KEY_LENGTH * 2) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`
    );
  }

  return Buffer.from(key, "hex");
}

export interface EncryptedData {
  data: string;
  iv: string;
  authTag: string;
}

export function encrypt(text: string): EncryptedData {
  if (!text) {
    throw new Error("Cannot encrypt empty text");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    data: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

export function decrypt(encrypted: EncryptedData): string {
  if (!encrypted || !encrypted.data || !encrypted.iv || !encrypted.authTag) {
    throw new Error("Invalid encrypted data structure");
  }

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(encrypted.iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(encrypted.authTag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted.data, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function encryptField(value: string | null | undefined): {
  encrypted: string | null;
  iv: string | null;
  authTag: string | null;
} {
  if (!value) {
    return { encrypted: null, iv: null, authTag: null };
  }

  const result = encrypt(value);
  return {
    encrypted: result.data,
    iv: result.iv,
    authTag: result.authTag,
  };
}

export function decryptField(
  encrypted: string | null,
  iv: string | null,
  authTag: string | null
): string | null {
  if (!encrypted || !iv || !authTag) {
    return null;
  }

  return decrypt({ data: encrypted, iv, authTag });
}

export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString("hex");
}

export function maskSensitiveData(data: string, visibleChars = 4): string {
  if (!data || data.length <= visibleChars) {
    return "****";
  }

  return "****" + data.slice(-visibleChars);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isMaskedEmail(email: string): boolean {
  return !email || email.includes("*") || email.includes("***");
}

function normalizeBase64(s: string): string {
  let out = s.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = out.length % 4;
  if (pad) out = out + "=".repeat(4 - pad);
  return out;
}

async function aesGcmPbkdf2Decrypt(
  encryptedData: string,
  encryptionKey: string
): Promise<string | null> {
  try {
    const raw = Buffer.from(normalizeBase64(encryptedData), "base64");

    // Format from import-contacts-csv: [salt(16) | iv(12) | ciphertext+authTag]
    // Web Crypto API automatically appends 16-byte auth tag to encrypted data
    if (raw.length < 16 + 12 + 16 + 1) {
      return null;
    }

    const salt = raw.subarray(0, 16);
    const iv = raw.subarray(16, 28);
    const encryptedWithTag = raw.subarray(28);

    // Derive key using PBKDF2 - exactly matching import logic
    const key = crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, "sha256");

    // In Web Crypto's AES-GCM output, auth tag is the last 16 bytes
    const authTagLength = 16;
    const authTag = encryptedWithTag.subarray(
      encryptedWithTag.length - authTagLength
    );
    const ciphertext = encryptedWithTag.subarray(
      0,
      encryptedWithTag.length - authTagLength
    );

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);

    const result = plaintext.toString("utf8");

    if (EMAIL_REGEX.test(result)) {
      return result;
    } else {
      return null;
    }
  } catch {
    return null;
  }
}

function xorDecrypt(encryptedData: string): string | null {
  try {
    const key = process.env.LEGACY_XOR_KEY;
    if (!key) {
      return null; // No legacy key configured, skip XOR decryption
    }

    const raw = Buffer.from(normalizeBase64(encryptedData), "base64").toString(
      "binary"
    );
    let out = "";

    for (let i = 0; i < raw.length; i++) {
      out += String.fromCharCode(
        raw.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }

    if (EMAIL_REGEX.test(out)) {
      return out;
    } else {
      return null;
    }
  } catch {
    return null;
  }
}

export async function decryptContactEmail(
  encryptedData: string,
  _contactId: string | number
): Promise<string> {
  const encryptionKey = configService.get<string>("ENCRYPTION_KEY");
  if (!encryptionKey) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  try {
    if (!encryptedData) {
      return "";
    }

    const aesResult = await aesGcmPbkdf2Decrypt(encryptedData, encryptionKey);
    if (aesResult) return aesResult;

    const xorResult = xorDecrypt(encryptedData);
    if (xorResult) return xorResult;

    try {
      const plain = Buffer.from(
        normalizeBase64(encryptedData),
        "base64"
      ).toString("utf8");
      if (EMAIL_REGEX.test(plain)) {
        return plain;
      }
    } catch {
      // Silent fail
    }

    return "";
  } catch {
    return "";
  }
}

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Encrypt contact data (email, phone, etc.) using AES-GCM + PBKDF2
 * Format: [salt(16) | iv(12) | ciphertext | authTag(16)] encoded as base64
 * This matches the format used by decryptContactEmail()
 */
export function encryptContactData(plaintext: string): string {
  if (!plaintext) {
    return "";
  }

  const encryptionKey = configService.get<string>("ENCRYPTION_KEY");
  if (!encryptionKey) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);

  // Derive key using PBKDF2 (matching decryption logic)
  const key = crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, "sha256");

  // Encrypt using AES-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine: salt + iv + encrypted + authTag
  const combined = Buffer.concat([salt, iv, encrypted, authTag]);

  // Return as base64
  return combined.toString("base64");
}
