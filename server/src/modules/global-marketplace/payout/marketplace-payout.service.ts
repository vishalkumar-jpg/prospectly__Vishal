import { Injectable, Logger, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { ProfilesService } from "modules/profiles/profiles.service";
import { assembleSharerTrackingDetails } from "./sharer-tracking.helper";
import {
  getMarketplaceDealInfoHelper,
  validatePaymentsCapturedHelper,
  getSharerClaimsHelper,
} from "./marketplace-payout.helpers";
import { getSharerTrackingData } from "./sharer-tracking-data.helper";

import {
  calculateMarketplacePayoutSplit,
  dollarsToCents,
} from "./marketplace-payout-calculation.util";
import {
  MarketplaceDealInfo,
  MarketplacePayoutSplit,
} from "./marketplace-payout.types";

@Injectable()
export class MarketplacePayoutService {
  private readonly logger = new Logger(MarketplacePayoutService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly profilesService: ProfilesService
  ) {}

  /**
   * Get marketplace deal information for payout processing
   */
  async getMarketplaceDealInfo(
    introductionRequestId: string
  ): Promise<MarketplaceDealInfo | null> {
    return getMarketplaceDealInfoHelper(
      this.db,
      this.logger,
      introductionRequestId
    );
  }

  /**
   * Calculate payout split for a marketplace deal
   * Does NOT apply user_credit_awards - marketplace deals have fixed split
   */
  calculatePayoutSplit(bountyAmount: number): MarketplacePayoutSplit {
    const bountyAmountCents = dollarsToCents(bountyAmount);
    return calculateMarketplacePayoutSplit(bountyAmountCents);
  }

  /**
   * Update marketplace claim with payout amounts
   */
  async updateClaimPayoutAmounts(
    introductionRequestId: string,
    claimerAmount: number,
    sharerAmount: number
  ) {
    await this.db
      .update(schema.marketplaceClaims)
      .set({
        claimerShare: String(claimerAmount),
        sharerShare: String(sharerAmount),
        status: "completed",
        updatedAt: toUTC(),
      })
      .where(
        eq(
          schema.marketplaceClaims.introductionRequestId,
          introductionRequestId
        )
      );
  }

  /**
   * Check if this is a marketplace deal
   */
  async isMarketplaceDeal(introductionRequestId: string): Promise<boolean> {
    const [claim] = await this.db
      .select({
        id: schema.marketplaceClaims.id,
      })
      .from(schema.marketplaceClaims)
      .where(
        and(
          eq(
            schema.marketplaceClaims.introductionRequestId,
            introductionRequestId
          ),
          eq(schema.marketplaceClaims.status, "completed")
        )
      )
      .limit(1);

    return !!claim;
  }

  /**
   * Get sharer claims for a user (deals they shared that were claimed)
   */
  async getSharerClaims(userId: string) {
    return getSharerClaimsHelper(this.db, userId);
  }

  /**
   * Validates that all payment stages have been captured before payout
   * Checks both intro_email_sent and meeting_booked stages
   */
  async validatePaymentsCaptured(
    introductionRequestId: string
  ): Promise<boolean> {
    return validatePaymentsCapturedHelper(
      this.db,
      this.logger,
      introductionRequestId
    );
  }

  /**
   * Get tracking details for a sharer (workflow progress)
   * Verifies that the user is a sharer for the given introduction request
   */
  async getSharerTrackingDetails(
    userId: string,
    requestId: string
  ): Promise<{
    workflowProgress: Array<{
      step: string;
      label: string;
      description: string;
      status: string;
      completedAt: string | null;
      actionNeeded: string | null;
    }>;
    currentTrustScore: number | null;
    qualifiesForImmediatePayout: boolean;
  }> {
    const { request, transaction, payout, paymentStages } =
      await getSharerTrackingData(this.db, userId, requestId);

    return assembleSharerTrackingDetails(
      request,
      transaction,
      payout,
      paymentStages
    );
  }
}
