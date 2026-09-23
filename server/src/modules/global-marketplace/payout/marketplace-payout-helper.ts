import { Injectable, Inject, Logger } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";
import { ProfilesService } from "modules/profiles/profiles.service";
import { PROCESSING_STATUS } from "modules/payout-queue/payout-queue.constants";
import {
  calculateMarketplacePayoutSplit,
  dollarsToCents,
  centsToDollars,
} from "./marketplace-payout-calculation.util";
import { MARKETPLACE_PAYOUT_ROLE } from "./marketplace-payout.constants";
import { MarketplaceDealInfo } from "./marketplace-payout.types";

@Injectable()
export class MarketplacePayoutHelper {
  private readonly logger = new Logger(MarketplacePayoutHelper.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly profilesService: ProfilesService
  ) {}

  /**
   * Gets claimer trust score (claimer is the connector)
   */
  async getClaimerTrustScore(claimerId: string): Promise<number | null> {
    const profile = await this.profilesService.getProfileById(claimerId);
    return profile?.trustScore ?? null;
  }

  /**
   * Checks if marketplace payout already exists and is completed
   * Returns true only if payout is completed (skip processing)
   * Returns false if pending/deferred/queued or no records (proceed with processing)
   */
  async checkMarketplacePayoutExists(
    introductionRequestId: string
  ): Promise<boolean> {
    // Check if there's a pending record - if yes, we need to proceed (return false)
    const pending = await this.db
      .select()
      .from(schema.payoutHistory)
      .where(
        and(
          eq(schema.payoutHistory.introductionRequestId, introductionRequestId),
          eq(schema.payoutHistory.isMarketplaceDeal, true),
          eq(schema.payoutHistory.status, "pending")
        )
      )
      .limit(1);

    // If pending record exists, return false to proceed with processing
    if (pending.length > 0) {
      return false;
    }

    // Check if there's a completed record - if yes, skip processing (return true)
    const completed = await this.db
      .select()
      .from(schema.payoutHistory)
      .where(
        and(
          eq(schema.payoutHistory.introductionRequestId, introductionRequestId),
          eq(schema.payoutHistory.isMarketplaceDeal, true),
          eq(schema.payoutHistory.status, "completed")
        )
      )
      .limit(1);

    // Return true only if completed (skip), false otherwise (proceed)
    return completed.length > 0;
  }

  /**
   * Creates deferred marketplace payout records (trust score below threshold)
   * Creates records for both claimer and sharer
   */
  async createDeferredMarketplacePayoutRecord(
    dealInfo: MarketplaceDealInfo,
    trustScore: number | null
  ): Promise<void> {
    const split = calculateMarketplacePayoutSplit(
      dollarsToCents(dealInfo.bountyAmount)
    );

    const claimerNetAmount = centsToDollars(split.claimerCents).toFixed(2);
    const sharerNetAmount = centsToDollars(split.sharerCents).toFixed(2);
    const platformCommissionAmount = centsToDollars(
      split.platformCents
    ).toFixed(2);

    await this.db.transaction(async (tx) => {
      // Insert claimer payout record
      await tx.insert(schema.payoutHistory).values({
        connectorId: dealInfo.claimerId,
        introductionRequestId: dealInfo.introductionRequestId,
        introductionTransactionId: dealInfo.introductionTransactionId,
        grossAmount: claimerNetAmount,
        netAmount: claimerNetAmount,
        platformCommissionAmount,
        isMarketplaceDeal: true,
        marketplaceRole: MARKETPLACE_PAYOUT_ROLE.CLAIMER,
        payoutEligible: true,
        processingStatus: PROCESSING_STATUS.PENDING,
        trustScoreAtPayout: trustScore,
        creditsApplied: "0",
      });

      // Insert sharer payout record
      await tx.insert(schema.payoutHistory).values({
        connectorId: dealInfo.sharerId,
        introductionRequestId: dealInfo.introductionRequestId,
        introductionTransactionId: dealInfo.introductionTransactionId,
        grossAmount: sharerNetAmount,
        netAmount: sharerNetAmount,
        platformCommissionAmount,
        isMarketplaceDeal: true,
        marketplaceRole: MARKETPLACE_PAYOUT_ROLE.SHARER,
        payoutEligible: true,
        processingStatus: PROCESSING_STATUS.PENDING,
        trustScoreAtPayout: trustScore,
        creditsApplied: "0",
      });
    });

    this.logger.log(
      `Created deferred marketplace payout records for request ${dealInfo.introductionRequestId}`
    );
  }

  /**
   * Creates queued marketplace payout records (trust score >= threshold)
   * Creates records for both claimer and sharer with job ID
   */
  async createQueuedMarketplacePayoutRecord(
    dealInfo: MarketplaceDealInfo,
    jobId: string,
    trustScore: number | null
  ): Promise<void> {
    const split = calculateMarketplacePayoutSplit(
      dollarsToCents(dealInfo.bountyAmount)
    );

    const claimerNetAmount = centsToDollars(split.claimerCents).toFixed(2);
    const sharerNetAmount = centsToDollars(split.sharerCents).toFixed(2);
    const platformCommissionAmount = centsToDollars(
      split.platformCents
    ).toFixed(2);

    await this.db.transaction(async (tx) => {
      // Insert claimer payout record
      await tx.insert(schema.payoutHistory).values({
        connectorId: dealInfo.claimerId,
        introductionRequestId: dealInfo.introductionRequestId,
        introductionTransactionId: dealInfo.introductionTransactionId,
        grossAmount: claimerNetAmount,
        netAmount: claimerNetAmount,
        platformCommissionAmount,
        isMarketplaceDeal: true,
        marketplaceRole: MARKETPLACE_PAYOUT_ROLE.CLAIMER,
        payoutEligible: true,
        processingStatus: PROCESSING_STATUS.QUEUED,
        jobId,
        payoutTriggeredBy: "trust_score",
        trustScoreAtPayout: trustScore,
        creditsApplied: "0",
      });

      // Insert sharer payout record
      await tx.insert(schema.payoutHistory).values({
        connectorId: dealInfo.sharerId,
        introductionRequestId: dealInfo.introductionRequestId,
        introductionTransactionId: dealInfo.introductionTransactionId,
        grossAmount: sharerNetAmount,
        netAmount: sharerNetAmount,
        platformCommissionAmount,
        isMarketplaceDeal: true,
        marketplaceRole: MARKETPLACE_PAYOUT_ROLE.SHARER,
        payoutEligible: true,
        processingStatus: PROCESSING_STATUS.QUEUED,
        jobId,
        payoutTriggeredBy: "trust_score",
        trustScoreAtPayout: trustScore,
        creditsApplied: "0",
      });
    });

    this.logger.log(
      `Created queued marketplace payout records for request ${dealInfo.introductionRequestId} with job ${jobId}`
    );
  }

  /**
   * Updates deferred marketplace payout records to queued status
   * Called when feedback is submitted for deferred payouts
   */
  async updateDeferredMarketplacePayoutToQueued(
    introductionRequestId: string,
    jobId: string
  ): Promise<void> {
    await this.db
      .update(schema.payoutHistory)
      .set({
        processingStatus: PROCESSING_STATUS.QUEUED,
        jobId,
        payoutTriggeredBy: "peer_feedback",
        updatedAt: toUTC(),
      })
      .where(
        and(
          eq(schema.payoutHistory.introductionRequestId, introductionRequestId),
          eq(schema.payoutHistory.isMarketplaceDeal, true),
          eq(schema.payoutHistory.processingStatus, PROCESSING_STATUS.PENDING)
        )
      );

    this.logger.log(
      `Updated deferred marketplace payout records to queued for request ${introductionRequestId} with job ${jobId}`
    );
  }

  /**
   * Checks if deferred marketplace payout records exist
   */
  async hasDeferredMarketplacePayout(
    introductionRequestId: string
  ): Promise<boolean> {
    const deferred = await this.db
      .select()
      .from(schema.payoutHistory)
      .where(
        and(
          eq(schema.payoutHistory.introductionRequestId, introductionRequestId),
          eq(schema.payoutHistory.isMarketplaceDeal, true),
          eq(schema.payoutHistory.processingStatus, PROCESSING_STATUS.PENDING)
        )
      )
      .limit(1);

    return deferred.length > 0;
  }

  /**
   * Gets all marketplace payout records for a request (claimer and sharer)
   */
  async getPayoutRecordsByRequestId(introductionRequestId: string) {
    return this.db
      .select()
      .from(schema.payoutHistory)
      .where(
        and(
          eq(schema.payoutHistory.introductionRequestId, introductionRequestId),
          eq(schema.payoutHistory.isMarketplaceDeal, true)
        )
      );
  }

  /**
   * Updates an individual payout record status
   */
  async updatePayoutRecordStatus(
    recordId: string,
    status: string,
    stripeOutboundPaymentId?: string,
    recipientAccountId?: string,
    errorMessage?: string,
    destinationCurrency?: string,
    fees?: { recipientReceivedAmount?: string; payoutFeeBreakdown?: unknown }
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      status,
      processingStatus:
        status === "completed"
          ? PROCESSING_STATUS.COMPLETED
          : status === "failed"
            ? PROCESSING_STATUS.FAILED
            : PROCESSING_STATUS.PROCESSING,
      updatedAt: toUTC(),
    };

    if (stripeOutboundPaymentId) {
      updateData.stripeOutboundPaymentId = stripeOutboundPaymentId;
      updateData.payoutReleased = true;
      updateData.payoutReleasedAt = toUTC();
      updateData.processingCompletedAt = toUTC();
    }

    if (recipientAccountId) {
      updateData.recipientAccountId = recipientAccountId;
    }

    if (destinationCurrency) {
      updateData.destinationCurrency = destinationCurrency;
    }

    if (fees?.recipientReceivedAmount) {
      updateData.recipientReceivedAmount = fees.recipientReceivedAmount;
    }

    if (fees?.payoutFeeBreakdown) {
      updateData.payoutFeeBreakdown = fees.payoutFeeBreakdown;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await this.db
      .update(schema.payoutHistory)
      .set(updateData)
      .where(eq(schema.payoutHistory.id, recordId));

    this.logger.log(`Updated payout record ${recordId} to status: ${status}`);
  }

  /**
   * Defers a marketplace payout because the recipient hasn't connected a bank
   * yet. Marked ONBOARDING_PENDING so it is auto-released by the v2 webhook once
   * they onboard (see releaseDeferredMarketplacePayoutsForUser).
   */
  async markPayoutRecordDeferred(recordId: string): Promise<void> {
    await this.db
      .update(schema.payoutHistory)
      .set({
        processingStatus: PROCESSING_STATUS.ONBOARDING_PENDING,
        errorMessage: "Awaiting bank onboarding",
        updatedAt: toUTC(),
      })
      .where(eq(schema.payoutHistory.id, recordId));

    this.logger.log(`Deferred marketplace payout record ${recordId}`);
  }

  /**
   * Returns the distinct introduction-request ids that have a deferred
   * (ONBOARDING_PENDING, not yet released) marketplace payout for this user —
   * used to re-queue them once the user connects their bank.
   */
  async getDeferredMarketplaceRequestIdsForUser(
    userId: string
  ): Promise<string[]> {
    const rows = await this.db
      .select({
        introductionRequestId: schema.payoutHistory.introductionRequestId,
      })
      .from(schema.payoutHistory)
      .where(
        and(
          eq(schema.payoutHistory.connectorId, userId),
          eq(schema.payoutHistory.isMarketplaceDeal, true),
          eq(
            schema.payoutHistory.processingStatus,
            PROCESSING_STATUS.ONBOARDING_PENDING
          ),
          eq(schema.payoutHistory.payoutReleased, false)
        )
      );

    const ids = new Set<string>();
    for (const row of rows) {
      if (row.introductionRequestId) ids.add(row.introductionRequestId);
    }
    return [...ids];
  }

  /**
   * Checks if a specific role (claimer/sharer) has already been paid for this request
   */
  async hasCompletedPayoutForRole(
    introductionRequestId: string,
    role: string
  ): Promise<boolean> {
    const completed = await this.db
      .select()
      .from(schema.payoutHistory)
      .where(
        and(
          eq(schema.payoutHistory.introductionRequestId, introductionRequestId),
          eq(schema.payoutHistory.isMarketplaceDeal, true),
          eq(schema.payoutHistory.marketplaceRole, role),
          eq(schema.payoutHistory.status, "completed")
        )
      )
      .limit(1);

    return completed.length > 0;
  }

  /**
   * Marks payout record as processing
   */
  async markPayoutRecordProcessing(recordId: string): Promise<void> {
    await this.db
      .update(schema.payoutHistory)
      .set({
        processingStatus: PROCESSING_STATUS.PROCESSING,
        processingStartedAt: toUTC(),
        updatedAt: toUTC(),
      })
      .where(eq(schema.payoutHistory.id, recordId));
  }

  /**
   * Gets payout record for a specific role
   */
  async getPayoutRecordForRole(introductionRequestId: string, role: string) {
    const [record] = await this.db
      .select()
      .from(schema.payoutHistory)
      .where(
        and(
          eq(schema.payoutHistory.introductionRequestId, introductionRequestId),
          eq(schema.payoutHistory.isMarketplaceDeal, true),
          eq(schema.payoutHistory.marketplaceRole, role)
        )
      )
      .limit(1);

    return record || null;
  }
}
