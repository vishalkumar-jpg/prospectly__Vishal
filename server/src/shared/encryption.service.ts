import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EncryptedData {
  data: string;
  iv: string;
  authTag: string;
}

@Injectable()
export class EncryptionService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  encrypt(text: string): EncryptedData {
    if (!text) {
      throw new Error("Cannot encrypt empty text");
    }

    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
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

  decrypt(encrypted: EncryptedData): string {
    if (!encrypted || !encrypted.data || !encrypted.iv || !encrypted.authTag) {
      throw new Error("Invalid encrypted data structure");
    }

    const key = this.getEncryptionKey();
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

  encryptContactData(plaintext: string): string {
    if (!plaintext) {
      return "";
    }

    const encryptionKey = this.configService.get<string>("ENCRYPTION_KEY");
    if (!encryptionKey) {
      throw new Error("ENCRYPTION_KEY environment variable is not set");
    }

    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);

    const key = crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, "sha256");

    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([salt, iv, encrypted, authTag]);

    return combined.toString("base64");
  }

  // Decrypt data encrypted with encryptContactData (without email validation)
  async decryptContactData(encryptedData: string): Promise<string> {
    if (!encryptedData) {
      return "";
    }

    try {
      const encryptionKey = this.configService.get<string>("ENCRYPTION_KEY");
      if (!encryptionKey) {
        throw new Error("ENCRYPTION_KEY environment variable is not set");
      }
      const raw = Buffer.from(encryptedData, "base64");

      if (raw.length < 16 + 12 + 16 + 1) {
        return "";
      }

      const salt = raw.subarray(0, 16);
      const iv = raw.subarray(16, 28);
      const encryptedWithTag = raw.subarray(28);

      const key = await this.handlePbkdf2Async(encryptionKey, salt);

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

      return plaintext.toString("utf8");
    } catch {
      return "";
    }
  }

  async decryptContactEmail(
    encryptedData: string,
    _contactId: string | number
  ): Promise<string> {
    const encryptionKey = this.configService.get<string>("ENCRYPTION_KEY");
    if (!encryptionKey) {
      throw new Error("ENCRYPTION_KEY environment variable is not set");
    }

    try {
      if (!encryptedData) {
        return "";
      }

      const aesResult = await this.aesGcmPbkdf2Decrypt(
        encryptedData,
        encryptionKey
      );
      if (aesResult) return aesResult;

      const xorResult = this.xorDecrypt(encryptedData);
      if (xorResult) return xorResult;

      try {
        const plain = Buffer.from(
          this.normalizeBase64(encryptedData),
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

  maskSensitiveData(data: string, visibleChars = 4): string {
    if (!data || data.length <= visibleChars) {
      return "****";
    }

    return "****" + data.slice(-visibleChars);
  }

  validateEmail(email: string): boolean {
    return EMAIL_REGEX.test(email);
  }

  private getEncryptionKey(): Buffer {
    const key = this.configService.get<string>("ENCRYPTION_KEY");

    if (!key) {
      throw new Error("ENCRYPTION_KEY environment variable is not set");
    }

    if (key.length !== 64) {
      throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
    }

    return Buffer.from(key, "hex");
  }

  private normalizeBase64(s: string): string {
    let out = s.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    const pad = out.length % 4;
    if (pad) out = out + "=".repeat(4 - pad);
    return out;
  }

  private async aesGcmPbkdf2Decrypt(
    encryptedData: string,
    encryptionKey: string
  ): Promise<string | null> {
    try {
      const raw = Buffer.from(this.normalizeBase64(encryptedData), "base64");

      if (raw.length < 16 + 12 + 16 + 1) {
        return null;
      }

      const salt = raw.subarray(0, 16);
      const iv = raw.subarray(16, 28);
      const encryptedWithTag = raw.subarray(28);

      const key = await this.handlePbkdf2Async(encryptionKey, salt);

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

  private handlePbkdf2Async(
    encryptionKey: string,
    salt: Buffer
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        encryptionKey,
        salt,
        100000,
        32,
        "sha256",
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        }
      );
    });
  }

  private xorDecrypt(encryptedData: string): string | null {
    try {
      const key = this.configService.get<string>("LEGACY_XOR_KEY");
      if (!key) {
        return null; // No legacy key configured, skip XOR decryption
      }

      const raw = Buffer.from(
        this.normalizeBase64(encryptedData),
        "base64"
      ).toString("binary");
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
}
