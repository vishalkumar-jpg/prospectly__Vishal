import { Injectable, Logger, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and } from "drizzle-orm";
import { createHash } from "node:crypto";
import { MarketplaceShareService } from "./marketplace-share.service";
import { TrackEventDto } from "../dto/track-event.dto";

@Injectable()
export class MarketplaceAnalyticsService {
  private readonly logger = new Logger(MarketplaceAnalyticsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly shareService: MarketplaceShareService
  ) {}

  /**
   * Normalizes IP addresses to ensure consistent hashing.
   * Handles IPv4, IPv6, ports, and IPv6-mapped IPv4 addresses.
   */
  private normalizeIp(ip: string): string {
    // Step 1: Lowercase the input for consistency
    let normalized = ip.toLowerCase();

    // Step 2: Handle IPv6-mapped IPv4 addresses BEFORE port removal
    // This prevents truncation of mapped IPv4s (e.g., ::ffff:127.0.0.1:8080)
    if (normalized.startsWith("::ffff:")) {
      normalized = normalized.slice(7);
    }

    // Step 3: Remove port numbers only for:
    // - IPv4 addresses (contains dots): 127.0.0.1:54321 -> 127.0.0.1
    // - Bracketed IPv6 addresses: [::1]:54321 -> ::1
    const hasBrackets = normalized.includes("[") && normalized.includes("]");

    if (hasBrackets) {
      // Extract IPv6 address from brackets: [::1]:54321 -> ::1
      normalized = normalized.slice(
        normalized.indexOf("[") + 1,
        normalized.indexOf("]")
      );
    } else if (normalized.includes(".")) {
      // IPv4 with port: 127.0.0.1:54321 -> 127.0.0.1
      const colonIndex = normalized.indexOf(":");
      if (colonIndex !== -1) {
        normalized = normalized.slice(0, colonIndex);
      }
    }
    // For unbracketed IPv6, don't attempt port removal (no heuristic)

    // Step 4: Normalize IPv6 loopback to IPv4 for consistency
    // This ensures ::1 and 127.0.0.1 are treated the same
    if (normalized === "::1") {
      normalized = "127.0.0.1";
    }

    return normalized;
  }

  /**
   * Hashes an IP address using SHA-256.
   * IP is normalized before hashing to ensure consistency.
   */
  private hashIp(ip: string): string {
    const normalized = this.normalizeIp(ip);
    return createHash("sha256").update(normalized).digest("hex").slice(0, 64);
  }

  async trackEvent(
    dto: TrackEventDto,
    ip: string,
    userAgent?: string,
    referrer?: string
  ) {
    const { eventType, sharerCode, metadata } = dto;

    // Get share by code
    const share = await this.shareService.getShareByCode(sharerCode);
    if (!share) {
      return { success: false };
    }

    const ipHash = this.hashIp(ip);

    // Use ON CONFLICT DO NOTHING to atomically handle duplicates
    // This prevents race conditions where multiple requests check and insert simultaneously
    const insertResult = await this.db
      .insert(schema.marketplaceShareEvents)
      .values({
        shareId: share.id,
        eventType,
        ipHash,
        userAgent: userAgent?.slice(0, 500),
        referrer: referrer?.slice(0, 1000),
        metadata,
      })
      .onConflictDoNothing({
        target: [
          schema.marketplaceShareEvents.shareId,
          schema.marketplaceShareEvents.eventType,
          schema.marketplaceShareEvents.ipHash,
        ],
      })
      .returning({ id: schema.marketplaceShareEvents.id });

    // If insert was successful (no conflict), return the new event ID
    if (insertResult.length > 0) {
      return {
        success: true,
        eventId: insertResult[0].id,
      };
    }

    // If conflict occurred (duplicate exists), query for the existing event
    const duplicateConditions = [
      eq(schema.marketplaceShareEvents.shareId, share.id),
      eq(schema.marketplaceShareEvents.eventType, eventType),
      eq(schema.marketplaceShareEvents.ipHash, ipHash),
    ];

    const [existingEvent] = await this.db
      .select({ id: schema.marketplaceShareEvents.id })
      .from(schema.marketplaceShareEvents)
      .where(and(...duplicateConditions))
      .limit(1);

    return {
      success: true,
      eventId: existingEvent?.id ?? null,
    };
  }

  /*
  async getShareAnalytics(shareId: string) {
    // Get event counts by type
    const eventCounts = await this.db
      .select({
        eventType: schema.marketplaceShareEvents.eventType,
        count: count(),
      })
      .from(schema.marketplaceShareEvents)
      .where(eq(schema.marketplaceShareEvents.shareId, shareId))
      .groupBy(schema.marketplaceShareEvents.eventType);

    // Get unique views (by IP)
    const [uniqueViews] = await this.db
      .select({
        count: sql<number>`count(distinct ${schema.marketplaceShareEvents.ipHash})`,
      })
      .from(schema.marketplaceShareEvents)
      .where(
        and(
          eq(schema.marketplaceShareEvents.shareId, shareId),
          eq(schema.marketplaceShareEvents.eventType, "view")
        )
      );

    const analytics: Record<string, number> = {};
    eventCounts.forEach((ec) => {
      analytics[ec.eventType] = Number(ec.count);
    });

    return {
      ...analytics,
      uniqueViews: Number(uniqueViews?.count ?? 0),
      conversionRate: this.calculateConversionRate(analytics),
    };
  }
  */

  /*
  async getSharerAnalytics(userId: string) {
    // Get all shares for user
    const shares = await this.db
      .select({
        id: schema.marketplaceShares.id,
        platform: schema.marketplaceShares.platform,
      })
      .from(schema.marketplaceShares)
      .where(eq(schema.marketplaceShares.sharerId, userId));

    if (!shares.length) {
      return this.getEmptyAnalytics();
    }

    const shareIds = shares.map((s) => s.id);

    // Get total event counts across all shares
    const eventCounts = await this.db
      .select({
        eventType: schema.marketplaceShareEvents.eventType,
        count: count(),
      })
      .from(schema.marketplaceShareEvents)
      .where(sql`${schema.marketplaceShareEvents.shareId} = ANY(${shareIds})`)
      .groupBy(schema.marketplaceShareEvents.eventType);

    // Get shares by platform
    const platformCounts: Record<string, number> = {};
    shares.forEach((s) => {
      platformCounts[s.platform] = (platformCounts[s.platform] || 0) + 1;
    });

    const analytics: Record<string, number> = {};
    eventCounts.forEach((ec) => {
      analytics[ec.eventType] = Number(ec.count);
    });

    return {
      totalShares: shares.length,
      sharesByPlatform: platformCounts,
      totalViews: analytics.view || 0,
      totalClicks: analytics.click || 0,
      signupAttempts: analytics.signup_start || 0,
      signupCompletes: analytics.signup_complete || 0,
      claimAttempts: analytics.claim_start || 0,
      claimCompletes: analytics.claim_complete || 0,
      conversionRate: this.calculateConversionRate(analytics),
    };
  }
  */

  /*
  private calculateConversionRate(analytics: Record<string, number>): number {
    const views = analytics.view || 0;
    const completes = analytics.claim_complete || 0;
    if (views === 0) return 0;
    return Math.round((completes / views) * 10000) / 100;
  }
  */

  /*
  private getEmptyAnalytics() {
    return {
      totalShares: 0,
      sharesByPlatform: {},
      totalViews: 0,
      totalClicks: 0,
      signupAttempts: 0,
      signupCompletes: 0,
      claimAttempts: 0,
      claimCompletes: 0,
      conversionRate: 0,
    };
  }
  */
}
