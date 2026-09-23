import crypto from "crypto";
import { getOsEnv } from "config/env.config";

const ENCRYPTION_KEY = getOsEnv("ENCRYPTION_KEY");
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

if (!ENCRYPTION_KEY) {
  throw new Error(
    "ENCRYPTION_KEY environment variable is required for field-level encryption"
  );
}

function getKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(ENCRYPTION_KEY!, salt, 100000, 32, "sha512");
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = getKey(salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, tag, encrypted]).toString("base64");
}

export function decrypt(encryptedData: string): string {
  const buffer = Buffer.from(encryptedData, "base64");

  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, TAG_POSITION);
  const tag = buffer.subarray(TAG_POSITION, ENCRYPTED_POSITION);
  const encrypted = buffer.subarray(ENCRYPTED_POSITION);

  const key = getKey(salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(encrypted) + decipher.final("utf8");
}

export function encryptIfPresent(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  return encrypt(value);
}

export function decryptIfPresent(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  try {
    return decrypt(value);
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
}
