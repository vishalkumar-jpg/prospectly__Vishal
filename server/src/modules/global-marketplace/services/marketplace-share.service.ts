import { Injectable, Logger, Inject, NotFoundException } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and, desc, sql, count, inArray } from "drizzle-orm";
import { ProfilesService } from "modules/profiles/profiles.service";
import { randomBytes } from "node:crypto";
import { ShareRequestDto } from "../dto/share-request.dto";
import { MARKETPLACE_MESSAGES } from "../global-marketplace.constants";

@Injectable()
export class MarketplaceShareService {
  private readonly logger = new Logger(MarketplaceShareService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly profilesService: ProfilesService
  ) {}

  private generateSharerCode(): string {
    return randomBytes(12).toString("hex");
  }

  async createShare(userId: string, dto: ShareRequestDto) {
    const {
      introductionRequestId,
      platform,
      utmSource,
      utmMedium,
      utmCampaign,
    } = dto;

    // Check if request exists and is marketplace visible
    const introRequest = await this.db
      .select()
      .from(schema.introductionRequests)
      .where(
        and(
          eq(schema.introductionRequests.id, introductionRequestId),
          eq(schema.introductionRequests.isMarketplaceVisible, true)
        )
      )
      .limit(1);

    if (!introRequest.length) {
      throw new NotFoundException(MARKETPLACE_MESSAGES.ERROR.REQUEST_NOT_FOUND);
    }

    // Check for existing share with same (request, user, platform) combination
    const [existingShare] = await this.db
      .select()
      .from(schema.marketplaceShares)
      .where(
        and(
          eq(
            schema.marketplaceShares.introductionRequestId,
            introductionRequestId
          ),
          eq(schema.marketplaceShares.sharerId, userId),
          eq(schema.marketplaceShares.platform, platform)
        )
      )
      .limit(1);

    // Return existing share instead of creating duplicate
    if (existingShare) {
      return {
        shareId: existingShare.id,
        sharerCode: existingShare.sharerCode,
        platform: existingShare.platform,
      };
    }

    // Create new share if none exists
    const sharerCode = this.generateSharerCode();

    const [share] = await this.db
      .insert(schema.marketplaceShares)
      .values({
        introductionRequestId,
        sharerId: userId,
        sharerCode,
        platform,
        utmSource,
        utmMedium,
        utmCampaign,
      })
      .returning();

    return {
      shareId: share.id,
      sharerCode: share.sharerCode,
      platform: share.platform,
    };
  }

  async getShareByCode(sharerCode: string) {
    const [share] = await this.db
      .select()
      .from(schema.marketplaceShares)
      .where(eq(schema.marketplaceShares.sharerCode, sharerCode))
      .limit(1);

    return share;
  }

  async getUserShares(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const shares = await this.db
      .select({
        id: schema.marketplaceShares.id,
        sharerCode: schema.marketplaceShares.sharerCode,
        platform: schema.marketplaceShares.platform,
        createdAt: schema.marketplaceShares.createdAt,
        introductionRequestId: schema.marketplaceShares.introductionRequestId,
        request: {
          id: schema.introductionRequests.id,
          contactName: schema.introductionRequests.contactName,
          bountyAmount: schema.introductionRequests.bountyAmount,
          meetingTitle: schema.introductionRequests.meetingTitle,
          status: schema.introductionRequests.status,
        },
        // Contact details from contacts table with fallback to contact_relationships
        contactTitle: sql<
          string | null
        >`COALESCE(${schema.contacts.title}, ${schema.contactRelationships.title})`.as(
          "contactTitle"
        ),
        contactCompany: schema.contacts.company,
        contactLinkedin: schema.contacts.linkedin,
        contactWebsite: schema.contacts.website,
        contactProfilePhotoUrl: schema.contacts.profilePhotoUrl,
      })
      .from(schema.marketplaceShares)
      .innerJoin(
        schema.introductionRequests,
        eq(
          schema.marketplaceShares.introductionRequestId,
          schema.introductionRequests.id
        )
      )
      .leftJoin(
        schema.contacts,
        eq(schema.introductionRequests.contactId, schema.contacts.id)
      )
      .leftJoin(
        schema.contactRelationships,
        and(
          eq(schema.contacts.id, schema.contactRelationships.contactId),
          eq(schema.contactRelationships.userId, userId)
        )
      )
      .where(
        and(
          eq(schema.marketplaceShares.sharerId, userId),
          eq(schema.introductionRequests.requesterArchived, false)
        )
      )
      .orderBy(desc(schema.marketplaceShares.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.marketplaceShares)
      .innerJoin(
        schema.introductionRequests,
        eq(
          schema.marketplaceShares.introductionRequestId,
          schema.introductionRequests.id
        )
      )
      .where(
        and(
          eq(schema.marketplaceShares.sharerId, userId),
          eq(schema.introductionRequests.requesterArchived, false)
        )
      );

    // Get share IDs from user's shares
    const shareIds = shares.map((s) => s.id);

    // Count click events per share
    const clickCounts =
      shareIds.length > 0
        ? await this.db
            .select({
              shareId: schema.marketplaceShareEvents.shareId,
              clicksCount: count(),
            })
            .from(schema.marketplaceShareEvents)
            .where(
              and(
                inArray(schema.marketplaceShareEvents.shareId, shareIds),
                eq(schema.marketplaceShareEvents.eventType, "view")
              )
            )
            .groupBy(schema.marketplaceShareEvents.shareId)
        : [];

    // Create a map: shareId -> clicksCount
    const clicksCountMap = new Map<string, number>();
    clickCounts.forEach((cc) => {
      clicksCountMap.set(cc.shareId, Number(cc.clicksCount));
    });

    // Convert contact photo URLs and add clicks count to each share
    const sharesWithClicks = await Promise.all(
      shares.map(async (share) => {
        const clicksCount = clicksCountMap.get(share.id) || 0;

        // Convert contact photo URL to CloudFront URL
        let contactProfilePhotoUrl = share.contactProfilePhotoUrl || null;
        if (contactProfilePhotoUrl) {
          const contactWithPhoto = {
            profilePhotoUrl: contactProfilePhotoUrl,
          };
          await this.profilesService.convertProfilePhotoUrlToFullUrl(
            contactWithPhoto
          );
          contactProfilePhotoUrl = contactWithPhoto.profilePhotoUrl;
        }

        return {
          id: share.id,
          sharerCode: share.sharerCode,
          platform: share.platform,
          createdAt: share.createdAt,
          clicksCount,
          request: share.request,
          contactTitle: share.contactTitle,
          contactCompany: share.contactCompany,
          contactLinkedin: share.contactLinkedin,
          contactWebsite: share.contactWebsite,
          contactProfilePhotoUrl,
        };
      })
    );

    return {
      shares: sharesWithClicks,
      total: Number(countResult?.count ?? 0),
      page,
      limit,
    };
  }
}
