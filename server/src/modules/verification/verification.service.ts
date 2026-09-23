import { Injectable, Logger, Inject } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq, and, isNull, gte, sql } from "drizzle-orm";
import { utcDayjs } from "utils/dayjs";
import { InvitesService } from "../invites/invites.service";

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(InvitesService)
    private readonly invitesService: InvitesService
  ) {}

  /**
   * Verify email match (strict case-insensitive matching)
   */
  verifyEmailMatch(
    inviteEmail: string,
    googleEmail: string
  ): {
    match: boolean;
    normalizedInvite: string;
    normalizedGoogle: string;
  } {
    return this.invitesService.validateEmailMatch(inviteEmail, googleEmail);
  }

  /**
   * Verify that contact was imported
   */
  async verifyContactImport(
    userId: string,
    inviteEmail: string
  ): Promise<boolean> {
    const normalizedEmail = inviteEmail.toLowerCase().trim();

    const contact = await this.db.query.contacts.findFirst({
      where: and(
        eq(schema.contacts.originalImporterId, userId),
        eq(schema.contacts.email, normalizedEmail),
        isNull(schema.contacts.deletedAt)
      ),
    });

    return !!contact;
  }

  /**
   * Detect fraud signals
   */
  async detectFraudSignals(
    inviteId: string,
    userId: string | null,
    context: {
      ipAddress?: string;
      userAgent?: string;
      email?: string;
    }
  ): Promise<string[]> {
    const signals: string[] = [];

    // Check for same IP accepting multiple invites
    if (context.ipAddress) {
      const recentLogs = await this.db.query.inviteVerificationLogs.findMany({
        where: and(
          eq(schema.inviteVerificationLogs.ipAddress, context.ipAddress),
          gte(
            schema.inviteVerificationLogs.createdAt,
            sql`NOW() - INTERVAL '24 hours'`
          )
        ),
      });

      if (recentLogs.length > 3) {
        signals.push("MULTIPLE_ACCEPTANCES_SAME_IP");
      }
    }

    // Check for rapid invite acceptance
    if (userId) {
      const userLogs = await this.db.query.inviteVerificationLogs.findMany({
        where: and(
          eq(schema.inviteVerificationLogs.userId, userId),
          gte(
            schema.inviteVerificationLogs.createdAt,
            sql`NOW() - INTERVAL '1 hour'`
          )
        ),
      });

      if (userLogs.length > 5) {
        signals.push("RAPID_ACCEPTANCE_RATE");
      }
    }

    // Check for disposable email domains (basic check)
    if (context.email) {
      const disposableDomains = [
        "tempmail.com",
        "10minutemail.com",
        "guerrillamail.com",
      ];
      const domain = context.email.split("@")[1]?.toLowerCase();
      if (domain && disposableDomains.includes(domain)) {
        signals.push("DISPOSABLE_EMAIL_DOMAIN");
      }
    }

    return signals;
  }

  /**
   * Check rate limits
   */
  async checkRateLimits(
    userId: string,
    action: string
  ): Promise<{ allowed: boolean; remaining: number }> {
    // Rate limit: 10 invites per hour
    const oneHourAgo = utcDayjs().subtract(1, "hour").toDate();

    const recentActions = await this.db.query.referralAuditLog.findMany({
      where: and(
        eq(schema.referralAuditLog.userId, userId),
        eq(schema.referralAuditLog.actionType, action),
        gte(schema.referralAuditLog.createdAt, oneHourAgo)
      ),
    });

    const limit = 10;
    const remaining = Math.max(0, limit - recentActions.length);

    return {
      allowed: remaining > 0,
      remaining,
    };
  }

  /**
   * Log verification attempt
   */
  async logVerification(
    inviteId: string,
    userId: string | null,
    type: string,
    status: string,
    data: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // Detect fraud signals
    const fraudSignals = await this.detectFraudSignals(inviteId, userId, {
      ipAddress,
      userAgent,
      email: data.email as string,
    });

    // Log via invites service
    await this.invitesService.logVerificationAttempt(
      inviteId,
      userId,
      type,
      status,
      data,
      ipAddress,
      userAgent,
      fraudSignals.length > 0 ? fraudSignals : undefined
    );
  }
}
