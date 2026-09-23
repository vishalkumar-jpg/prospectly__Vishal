import { Injectable } from "@nestjs/common";
import { RECRUITMENT_FEE_CONFIG_DEFAULTS } from "./recruitment-fee-config.constants";

@Injectable()
export class RecruitmentFeeConfigService {
  getConnectorPercent(): number {
    return RECRUITMENT_FEE_CONFIG_DEFAULTS.CONNECTOR_PERCENT;
  }

  getPlatformPercent(): number {
    return RECRUITMENT_FEE_CONFIG_DEFAULTS.PLATFORM_PERCENT;
  }

  getCandidateSuccessFeeRecipientPercent(): number {
    return RECRUITMENT_FEE_CONFIG_DEFAULTS.CANDIDATE_SUCCESS_FEE_RECIPIENT_PERCENT;
  }

  getCandidateSuccessFeePlatformPercent(): number {
    return RECRUITMENT_FEE_CONFIG_DEFAULTS.CANDIDATE_SUCCESS_FEE_PLATFORM_PERCENT;
  }

  // Per-recipient share inside the connector pool when a candidate has two
  // connectors (claimer + sharer). Caller multiplies by the connector pool,
  // not by gross.
  getSplitConnectorSharePercent(): number {
    return RECRUITMENT_FEE_CONFIG_DEFAULTS.SPLIT_CONNECTOR_SHARE_PERCENT;
  }

  // Returns a 2-decimal string so callers (e.g. marketplace list, public job
  // response) can pass it straight through the API without re-formatting.
  splitAmount(amount: number, percent: number): string {
    return ((amount * percent) / 100).toFixed(2);
  }

  // Connector's actual payout: connector pool (gross × connector%) sliced by
  // the connector's share of that pool (100 for primary, 50 for sharer/claimer).
  // Two-step rounding mirrors how splits are persisted in
  // recruitment_candidate_connectors.sharePercent so the read side and write
  // side cannot drift. Returned as a 2-decimal string for direct API use.
  getConnectorPayoutAmount(grossAmount: number, sharePercent: number): string {
    const connectorPool = parseFloat(
      this.splitAmount(grossAmount, this.getConnectorPercent())
    );
    return this.splitAmount(connectorPool, sharePercent);
  }

  // Persistable per-row breakdown for a connector payout. Anchored on
  // getConnectorPayoutAmount() so the value written to recruitment_payout_history
  // matches what the connector-pipeline endpoint returns to the connector — no
  // cent-level drift between read and write. The platform slice absorbs any
  // rounding remainder of this recipient's gross share, so connectors are
  // never shorted.
  getConnectorPayoutBreakdown(
    grossAmount: number,
    sharePercent: number
  ): { recipientAmount: string; platformAmount: string } {
    const recipientAmount = this.getConnectorPayoutAmount(
      grossAmount,
      sharePercent
    );
    const recipientGrossSlice = parseFloat(
      this.splitAmount(grossAmount, sharePercent)
    );
    const platformAmount = (
      recipientGrossSlice - parseFloat(recipientAmount)
    ).toFixed(2);
    return { recipientAmount, platformAmount };
  }

  // Sharer earnings on a split deal: split-share% of connector% of gross.
  // E.g. 50% of 80% = 40% of gross. Returned as a 2-decimal string for
  // direct API use.
  getSharerPayoutAmount(grossAmount: number): string {
    return this.getConnectorPayoutAmount(
      grossAmount,
      this.getSplitConnectorSharePercent()
    );
  }
}
