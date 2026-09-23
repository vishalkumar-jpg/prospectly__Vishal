import { Injectable } from "@nestjs/common";
import { calculateShortlistFees } from "../shortlist-fee.utils";

export interface FlatReferralFeeResult {
  /** Recruiter-entered flat referral fee. */
  flatReferralAmount: number;
  /** Stripe processing fee (2.9% + $0.30) on the flat fee. */
  stripeFee: number;
  /** Flat application fee. */
  applicationFee: number;
  /** flatReferralAmount + stripeFee + applicationFee — charged in full at hire. */
  total: number;
}

@Injectable()
export class FlatReferralFeeService {
  /**
   * Computes the Flat Referral Model fee breakdown for a recruiter-entered flat
   * fee, using the shared gross-up logic in `calculateShortlistFees`. The whole
   * `total` is captured in one charge when a candidate is moved to Hired —
   * nothing is charged at publish or at shortlist.
   *
   * This is the single source of truth used by both the GET preview endpoint
   * and job creation — the client never supplies the computed values.
   */
  async calculateFlatReferralFee(
    flatAmount: number
  ): Promise<FlatReferralFeeResult> {
    const fees = calculateShortlistFees(flatAmount);
    const total =
      Math.round(
        (flatAmount + fees.providerFeeDollars + fees.processingFeeDollars) * 100
      ) / 100;

    return {
      flatReferralAmount: flatAmount,
      stripeFee: fees.providerFeeDollars,
      applicationFee: fees.processingFeeDollars,
      total,
    };
  }

  /**
   * Rounded top-up owed to move a payout from `oldTotal` up to `newTotal`; never
   * negative (a lowered fee owes nothing). Single source of truth for the diff so
   * the release-time charge and the HR-facing preview can never drift apart.
   */
  roundTopUpDiff(newTotal: number, oldTotal: number): number {
    return Math.max(0, Math.round((newTotal - oldTotal) * 100) / 100);
  }
}
