import { Injectable } from "@nestjs/common";
import { CreditUsageHelper } from "modules/credits/helpers/credit-usage.helper";

export interface PayoutCalculation {
  recipientBaseCents: number;
  platformBaseCents: number;
  effectiveRecipientCents: number;
  effectivePlatformCents: number;
  creditApplication: {
    creditsToApply: number;
    connectorBonusCents: number;
    effectiveCommissionCents: number;
    newBalance: number;
  };
}

// Applies credit offsets to a pre-computed (recipientBaseCents, platformBaseCents)
// pair. The 80/20 split is no longer hard-coded here — callers pass the
// per-row base amounts that were snapshotted when the payout row was
// created. This lets the same calculator handle single-connector payouts
// (gross × 80/20) AND split payouts (each row carrying gross × 40/10).
@Injectable()
export class RecruitmentPayoutCalculatorService {
  constructor(private readonly creditUsageHelper: CreditUsageHelper) {}

  async calculate(
    recipientId: string,
    recipientBaseCents: number,
    platformBaseCents: number
  ): Promise<PayoutCalculation> {
    // Credits can ONLY offset this recipient's OWN platform slice — never
    // the other connector's slice, never beyond what the platform would
    // take for this sub-payout.
    const creditApplication =
      await this.creditUsageHelper.calculateCreditApplicationForUser(
        recipientId,
        platformBaseCents
      );

    return {
      recipientBaseCents,
      platformBaseCents,
      effectiveRecipientCents:
        recipientBaseCents + creditApplication.connectorBonusCents,
      effectivePlatformCents: creditApplication.effectiveCommissionCents,
      creditApplication,
    };
  }
}
