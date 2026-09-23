import { Injectable, Logger, Inject, NotFoundException } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { VerifyClaimDto } from "../dto/claim-request.dto";
import { MARKETPLACE_MESSAGES } from "../global-marketplace.constants";

const BOUNTY_SPLIT = 0.5;

@Injectable()
export class MarketplaceClaimVerifyService {
  private readonly logger = new Logger(MarketplaceClaimVerifyService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async verifyClaim(userId: string, dto: VerifyClaimDto) {
    const { claimId, prospectContactId } = dto;

    const [claim] = await this.db
      .select()
      .from(schema.marketplaceClaims)
      .where(
        and(
          eq(schema.marketplaceClaims.id, claimId),
          eq(schema.marketplaceClaims.claimerId, userId)
        )
      )
      .limit(1);

    if (!claim) {
      throw new NotFoundException(MARKETPLACE_MESSAGES.ERROR.CLAIM_NOT_FOUND);
    }

    const [relationship] = await this.db
      .select()
      .from(schema.contactRelationships)
      .where(
        and(
          eq(schema.contactRelationships.userId, userId),
          eq(schema.contactRelationships.contactId, prospectContactId)
        )
      )
      .limit(1);

    if (!relationship) {
      await this.db
        .update(schema.marketplaceClaims)
        .set({
          status: "failed",
          failureReason: "Prospect not found in contacts",
          updatedAt: toUTC(),
        })
        .where(eq(schema.marketplaceClaims.id, claimId));

      return {
        verified: false,
        claimId,
        status: "failed",
        message: MARKETPLACE_MESSAGES.ERROR.PROSPECT_NOT_IN_CONTACTS,
      };
    }

    const [request] = await this.db
      .select({ bountyAmount: schema.introductionRequests.bountyAmount })
      .from(schema.introductionRequests)
      .where(eq(schema.introductionRequests.id, claim.introductionRequestId))
      .limit(1);

    const bountyAmount = Number(request?.bountyAmount ?? 0);
    const claimerShare = bountyAmount * BOUNTY_SPLIT;
    const sharerShare = bountyAmount * BOUNTY_SPLIT;

    await this.db
      .update(schema.marketplaceClaims)
      .set({
        status: "verified",
        verificationCompletedAt: toUTC(),
        claimerShare: claimerShare.toString(),
        sharerShare: sharerShare.toString(),
        updatedAt: toUTC(),
      })
      .where(eq(schema.marketplaceClaims.id, claimId));

    return {
      verified: true,
      claimId,
      status: "verified",
      claimerShare,
      sharerShare,
      message: MARKETPLACE_MESSAGES.INFO.CLAIM_VERIFIED,
    };
  }

  async completeClaim(userId: string, claimId: string) {
    const [claim] = await this.db
      .select()
      .from(schema.marketplaceClaims)
      .where(
        and(
          eq(schema.marketplaceClaims.id, claimId),
          eq(schema.marketplaceClaims.claimerId, userId),
          eq(schema.marketplaceClaims.status, "verified")
        )
      )
      .limit(1);

    if (!claim) {
      throw new NotFoundException(
        MARKETPLACE_MESSAGES.ERROR.CLAIM_NOT_VERIFIED
      );
    }

    await this.db
      .update(schema.introductionRequests)
      .set({
        acceptedBy: userId,
        acceptedAt: toUTC(),
        updatedAt: toUTC(),
      })
      .where(eq(schema.introductionRequests.id, claim.introductionRequestId));

    await this.db
      .update(schema.marketplaceClaims)
      .set({
        status: "completed",
        claimedAt: toUTC(),
        updatedAt: toUTC(),
      })
      .where(eq(schema.marketplaceClaims.id, claimId));

    return {
      claimId,
      status: "completed",
      message: MARKETPLACE_MESSAGES.INFO.CLAIM_COMPLETED,
    };
  }

  async getUserClaims(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const claims = await this.db
      .select({
        id: schema.marketplaceClaims.id,
        status: schema.marketplaceClaims.status,
        claimerShare: schema.marketplaceClaims.claimerShare,
        sharerShare: schema.marketplaceClaims.sharerShare,
        failureReason: schema.marketplaceClaims.failureReason,
        claimedAt: schema.marketplaceClaims.claimedAt,
        createdAt: schema.marketplaceClaims.createdAt,
        verificationTriggeredAt:
          schema.marketplaceClaims.verificationTriggeredAt,
        request: {
          id: schema.introductionRequests.id,
          contactName: schema.introductionRequests.contactName,
          contactCompany: schema.contacts.company,
          bountyAmount: schema.introductionRequests.bountyAmount,
          meetingTitle: schema.introductionRequests.meetingTitle,
        },
      })
      .from(schema.marketplaceClaims)
      .innerJoin(
        schema.introductionRequests,
        eq(
          schema.marketplaceClaims.introductionRequestId,
          schema.introductionRequests.id
        )
      )
      .leftJoin(
        schema.contacts,
        eq(schema.introductionRequests.contactId, schema.contacts.id)
      )
      .where(eq(schema.marketplaceClaims.claimerId, userId))
      .orderBy(desc(schema.marketplaceClaims.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.marketplaceClaims)
      .where(eq(schema.marketplaceClaims.claimerId, userId));

    return {
      claims,
      total: Number(countResult?.count ?? 0),
      page,
      limit,
    };
  }

  async getClaimStatus(userId: string, claimId: string) {
    const [claim] = await this.db
      .select({
        id: schema.marketplaceClaims.id,
        status: schema.marketplaceClaims.status,
        failureReason: schema.marketplaceClaims.failureReason,
        claimerShare: schema.marketplaceClaims.claimerShare,
        sharerShare: schema.marketplaceClaims.sharerShare,
        verificationCompletedAt:
          schema.marketplaceClaims.verificationCompletedAt,
        verificationTriggeredAt:
          schema.marketplaceClaims.verificationTriggeredAt,
        claimedAt: schema.marketplaceClaims.claimedAt,
      })
      .from(schema.marketplaceClaims)
      .where(
        and(
          eq(schema.marketplaceClaims.id, claimId),
          eq(schema.marketplaceClaims.claimerId, userId)
        )
      )
      .limit(1);

    if (!claim) {
      throw new NotFoundException(MARKETPLACE_MESSAGES.ERROR.CLAIM_NOT_FOUND);
    }

    return {
      id: claim.id,
      status: claim.status,
      failureReason: claim.failureReason,
      claimerShare: claim.claimerShare ? Number(claim.claimerShare) : undefined,
      sharerShare: claim.sharerShare ? Number(claim.sharerShare) : undefined,
      verificationCompletedAt: claim.verificationCompletedAt,
      verificationTriggeredAt: claim.verificationTriggeredAt,
      claimedAt: claim.claimedAt,
    };
  }
}
