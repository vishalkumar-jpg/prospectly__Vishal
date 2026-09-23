import { Injectable, Inject, Logger } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { CreditBalanceHelper } from "./credit-balance.helper";
import { CREDIT_TRANSACTION_TYPES } from "../credits.constants";
import { CreditApplicationResult } from "../credits.types";
import {
  calculateCreditApplication,
} from "../utils/credit-calculations.util";

/**
 * Credit Usage Helper
 *
 * Handles credit usage during payout processing.
 */
@Injectable()
export class CreditUsageHelper {
  private readonly logger = new Logger(CreditUsageHelper.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly creditBalanceHelper: CreditBalanceHelper
  ) {}

  /**
   * Calculate how many credits to apply to a payout
   *
   * @param userId - The connector's user ID
   * @param commissionAmountCents - Platform commission in cents
   * @returns Credit application result
   */
  async calculateCreditApplicationForUser(
    userId: string,
    commissionAmountCents: number
  ): Promise<CreditApplicationResult> {
    const creditBalance = await this.creditBalanceHelper.getBalance(userId);

    if (creditBalance <= 0) {
      return {
        creditsToApply: 0,
        creditsToApplyCents: 0,
        effectiveCommissionCents: commissionAmountCents,
        connectorBonusCents: 0,
        newBalance: 0,
        hadCredits: false,
      };
    }

    const result = calculateCreditApplication(
      creditBalance,
      commissionAmountCents
    );

    const newBalance = creditBalance - result.creditsToApply;

    return {
      ...result,
      newBalance,
      hadCredits: true,
    };
  }

  /**
   * Apply credits to a payout and deduct from user's balance
   * This should be called within a transaction
   *
   * @param tx - Database transaction
   * @param userId - The connector's user ID
   * @param payoutId - The payout history ID
   * @param requestId - The introduction request ID
   * @param creditsToApply - Amount of credits to apply (in dollars)
   * @param bountyAmount - Original bounty amount
   * @param originalCommission - Original commission before credits
   * @param effectiveCommission - Commission after credits applied
   * @param connectorReceived - Amount connector received
   */
  async applyCreditsToPayout(
    tx: PostgresJsDatabase<typeof schema>,
    userId: string,
    payoutId: string,
    requestId: string,
    creditsToApply: number,
    bountyAmount: number,
    originalCommission: number,
    effectiveCommission: number,
    connectorReceived: number
  ): Promise<{ balanceBefore: number; balanceAfter: number }> {
    // Deduct credits from user's balance
    const { balanceBefore, balanceAfter } =
      await this.creditBalanceHelper.deductCredits(tx, userId, creditsToApply);

    // Record in credit history
    await tx.insert(schema.userCreditHistory).values({
      userId,
      transactionType: CREDIT_TRANSACTION_TYPES.USED,
      amount: creditsToApply.toFixed(2),
      balanceBefore: balanceBefore.toFixed(2),
      balanceAfter: balanceAfter.toFixed(2),
      introductionRequestId: requestId,
      payoutHistoryId: payoutId,
      evidence: {
        bountyAmount,
        originalCommission,
        commissionAfterCredits: effectiveCommission,
        connectorReceived,
      },
    });

    this.logger.log(
      `Applied ${creditsToApply} credits for payout ${payoutId}, balance: ${balanceBefore} -> ${balanceAfter}`
    );

    return { balanceBefore, balanceAfter };
  }

  /**
   * Standalone method to apply credits outside of an existing transaction
   * Creates its own transaction for atomicity
   */
  async applyCreditsToPayoutStandalone(
    userId: string,
    payoutId: string,
    requestId: string,
    creditsToApply: number,
    bountyAmount: number,
    originalCommission: number,
    effectiveCommission: number,
    connectorReceived: number
  ): Promise<{ balanceBefore: number; balanceAfter: number }> {
    let result = { balanceBefore: 0, balanceAfter: 0 };

    await this.db.transaction(async (tx) => {
      result = await this.applyCreditsToPayout(
        tx,
        userId,
        payoutId,
        requestId,
        creditsToApply,
        bountyAmount,
        originalCommission,
        effectiveCommission,
        connectorReceived
      );
    });

    return result;
  }
}
