import { Injectable } from "@nestjs/common";
import { toUTC } from "utils/dayjs";
import * as bcrypt from "bcryptjs";
import * as crypto from "node:crypto";

const SALT_ROUNDS = 10;

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  tokenType?: "access" | "refresh";
}

export interface RefreshToken {
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

@Injectable()
export class CryptoService {
  private refreshTokenStore = new Map<string, RefreshToken>();

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  generateCSRFToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  storeRefreshToken(token: string, userId: string): void {
    const expiresAt = toUTC();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    this.refreshTokenStore.set(token, {
      token,
      userId,
      expiresAt,
      createdAt: toUTC(),
    });
  }

  invalidateRefreshToken(token: string): void {
    this.refreshTokenStore.delete(token);
  }

  isRefreshTokenValid(token: string): boolean {
    const storedToken = this.refreshTokenStore.get(token);
    if (!storedToken) return false;
    if (storedToken.expiresAt < toUTC()) {
      this.refreshTokenStore.delete(token);
      return false;
    }
    return true;
  }

  generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString("hex");
  }
}
