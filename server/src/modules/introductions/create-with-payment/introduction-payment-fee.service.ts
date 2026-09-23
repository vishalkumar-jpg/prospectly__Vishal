import { BadRequestException, Injectable } from "@nestjs/common";
import { MINIMUM_BOUNTY_AMOUNT } from "config/payment.config";
import {
  calculateSplitAmounts,
  convertToDollars,
} from "modules/payments/utils/payment-calculations.util";
import { calculateRequesterCardFees } from "utils/requester-card-fee.util";

export interface IntroductionPaymentFeeResult {
  bountyAmount: number;
  providerFee: number;
  processingFee: number;
  totalAmount: number;
  initialChargeAmount: number;
  remainingChargeAmount: number;
}

@Injectable()
export class IntroductionPaymentFeeService {
  calculateFees(bountyAmount: number): IntroductionPaymentFeeResult {
    if (
      !Number.isFinite(bountyAmount) ||
      bountyAmount < MINIMUM_BOUNTY_AMOUNT
    ) {
      throw new BadRequestException(
        `Referral payout must be at least $${MINIMUM_BOUNTY_AMOUNT}`
      );
    }

    const fees = calculateRequesterCardFees(bountyAmount);
    const split = calculateSplitAmounts(fees.totalDollars);

    return {
      bountyAmount: fees.bountyAmountDollars,
      providerFee: fees.providerFeeDollars,
      processingFee: fees.processingFeeDollars,
      totalAmount: fees.totalDollars,
      initialChargeAmount: convertToDollars(split.initialAmountCents),
      remainingChargeAmount: convertToDollars(split.remainingAmountCents),
    };
  }
}
