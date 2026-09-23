import { Injectable, Inject } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";
import { AnyType } from "types/common";
import { FinancesService } from "modules/finances/finances.service";
import {
  calculatePayoutSplit,
  convertToCents,
  convertToDollars,
} from "modules/payments/utils/payment-calculations.util";
import { PROCESSING_STATUS } from "modules/payout-queue/payout-queue.constants";

@Injectable()
export class PayoutRecordHelper {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly financesService: FinancesService
  ) {}

  /**
   * Creates a payout record for queued (immediate) payouts
   */
  async createQueuedPayoutRecord(
    requestId: string,
    connectorId: string,
    bountyAmount: number | string,
    jobId: string,
    trustScore: number | null
  ): Promise<void> {
    const payoutData = this.calculatePayoutData(bountyAmount);

    await this.financesService.upsertPayoutHistory(requestId, connectorId, {
      ...payoutData,
      payoutEligible: true,
      processingStatus: PROCESSING_STATUS.QUEUED,
      jobId,
      trustScoreAtPayout: trustScore,
      payoutTriggeredBy: "trust_score",
    });
  }

  /**
   * Creates a payout record when connector is pending Stripe onboarding
   */
  async createPendingPayoutRecord(
    requestId: string,
    connectorId: string,
    bountyAmount: number | string
  ): Promise<void> {
    const payoutData = this.calculatePayoutData(bountyAmount);

    await this.financesService.upsertPayoutHistory(requestId, connectorId, {
      ...payoutData,
      payoutEligible: true,
      processingStatus: PROCESSING_STATUS.ONBOARDING_PENDING,
      errorMessage: "Waiting for Stripe Connect account onboarding",
    });
  }

  /**
   * Creates a deferred payout record (trust score below threshold)
   */
  async createDeferredPayoutRecord(
    requestId: string,
    connectorId: string,
    bountyAmount: number | string,
    trustScore: number | null
  ): Promise<void> {
    const payoutData = this.calculatePayoutData(bountyAmount);

    await this.financesService.upsertPayoutHistory(requestId, connectorId, {
      ...payoutData,
      payoutEligible: true,
      processingStatus: PROCESSING_STATUS.PENDING,
      trustScoreAtPayout: trustScore,
    });

    await this.updateIntroductionRequest(requestId, {
      payoutEligible: true,
      connectorTrustScoreAtPayout: trustScore,
    });
  }

  /**
   * Updates introduction request with partial data
   */
  async updateIntroductionRequest(
    requestId: string,
    data: AnyType
  ): Promise<void> {
    await this.db
      .update(schema.introductionRequests)
      .set({ ...data, updatedAt: toUTC() })
      .where(eq(schema.introductionRequests.id, requestId));
  }

  /**
   * Calculates payout split data from bounty amount
   */
  private calculatePayoutData(bountyAmount: number | string): {
    grossAmount: string;
    platformCommissionAmount: string;
    netAmount: string;
  } {
    const numericAmount = Number(bountyAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error(`Invalid referral payout amount: ${bountyAmount}`);
    }
    const totalCapturedCents = convertToCents(numericAmount);
    const payoutSplit = calculatePayoutSplit(totalCapturedCents);

    return {
      grossAmount: String(bountyAmount),
      platformCommissionAmount: convertToDollars(
        payoutSplit.platformAmountCents
      ).toString(),
      netAmount: convertToDollars(payoutSplit.connectorAmountCents).toString(),
    };
  }
}
