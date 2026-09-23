import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import crypto from "node:crypto";

const USER_PREFIX = "unsub:user:";
const EMAIL_PREFIX = "unsub:email:";

@Injectable()
export class UnsubscribeTokenService {
  private readonly logger = new Logger(UnsubscribeTokenService.name);
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret =
      this.configService.get<string>("UNSUBSCRIBE_SECRET") ??
      this.configService.get<string>("JWT_SECRET") ??
      "";

    if (!this.secret) {
      this.logger.warn(
        "UNSUBSCRIBE_SECRET not configured — unsubscribe links will fail verification"
      );
    }
  }

  signForUser(userId: string): string {
    return this.sign(`${USER_PREFIX}${userId}`);
  }

  signForEmail(email: string): string {
    return this.sign(`${EMAIL_PREFIX}${email.trim().toLowerCase()}`);
  }

  verifyUser(userId: string, signature: string): boolean {
    return this.verify(`${USER_PREFIX}${userId}`, signature);
  }

  verifyEmail(email: string, signature: string): boolean {
    return this.verify(
      `${EMAIL_PREFIX}${email.trim().toLowerCase()}`,
      signature
    );
  }

  buildRegisteredUnsubscribeUrl(
    frontendUrl: string,
    userId: string,
    categoryKey?: string
  ): string {
    const sig = this.signForUser(userId);
    const params = new URLSearchParams({ u: userId, sig });
    if (categoryKey) params.set("category", categoryKey);
    return `${frontendUrl.replace(/\/$/, "")}/unsubscribe?${params.toString()}`;
  }

  buildEmailUnsubscribeUrl(
    frontendUrl: string,
    email: string,
    categoryKey?: string
  ): string {
    const normalized = email.trim().toLowerCase();
    const sig = this.signForEmail(normalized);
    const params = new URLSearchParams({
      e: Buffer.from(normalized, "utf8").toString("base64url"),
      sig,
    });
    if (categoryKey) params.set("category", categoryKey);
    return `${frontendUrl.replace(/\/$/, "")}/unsubscribe?${params.toString()}`;
  }

  decodeEmailParam(encoded: string): string {
    return Buffer.from(encoded, "base64url")
      .toString("utf8")
      .trim()
      .toLowerCase();
  }

  private sign(payload: string): string {
    return crypto
      .createHmac("sha256", this.secret)
      .update(payload)
      .digest("base64url");
  }

  private verify(payload: string, signature: string): boolean {
    if (!this.secret || !signature?.trim()) return false;
    const expected = this.sign(payload);
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}
