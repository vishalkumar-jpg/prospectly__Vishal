import { Injectable, BadRequestException } from "@nestjs/common";
import { FlatReferralFeeService } from "../../interview-cost/services/flat-referral-fee.service";
import { RECRUITMENT_JOBS_MESSAGES } from "../recruitment-jobs.constants";

/** Structural input — satisfied by both the create DTO and the update DTO. */
export interface JobPricingInput {
  flatReferralAmount?: number;
}

/** The pricing columns persisted on `recruitment_job_prices`. */
export interface JobPricingFields {
  bountyAmount: string;
  suggestedBountyAmount: string;
  providerFee: string;
  processingFee: string;
  totalAmount: string;
  flatReferralAmount: string | null;
}

/**
 * Resolves the pricing columns for a recruitment job. Shared by job creation and
 * updates so both paths compute pricing the same way. All fee values are
 * computed server-side via `FlatReferralFeeService` — the client never supplies
 * them, so a crafted payload cannot bypass the Stripe/application fees.
 */
@Injectable()
export class RecruitmentJobPricingService {
  constructor(
    private readonly flatReferralFeeService: FlatReferralFeeService
  ) {}

  async resolvePricingFields(
    input: JobPricingInput
  ): Promise<JobPricingFields> {
    // Treat null the same as omitted — a body can send `flatReferralAmount: null`,
    // which @IsOptional() lets through and would otherwise reach the calculator.
    if (input.flatReferralAmount == null) {
      throw new BadRequestException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.FLAT_REFERRAL_AMOUNT_REQUIRED
      );
    }
    const flat = await this.flatReferralFeeService.calculateFlatReferralFee(
      input.flatReferralAmount
    );
    // bounty/suggested mirror the recruiter-entered flat fee so downstream
    // consumers that read bountyAmount still see a value.
    const flatAmount = flat.flatReferralAmount.toFixed(2);
    return {
      bountyAmount: flatAmount,
      suggestedBountyAmount: flatAmount,
      providerFee: flat.stripeFee.toFixed(2),
      processingFee: flat.applicationFee.toFixed(2),
      totalAmount: flat.total.toFixed(2),
      flatReferralAmount: flat.flatReferralAmount.toFixed(2),
    };
  }
}
