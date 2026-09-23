import { Injectable, Inject, NotFoundException, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import { StripeService } from "modules/stripe/stripe.service";
import {
  RECRUITMENT_INTERVIEW_TXN_TYPE,
  RECRUITMENT_INTERVIEW_TXN_STATUS,
} from "modules/recruitment/payout/recruitment-payout.constants";
import { getCapturedFlatDepositAmount } from "../flat-deposit.utils";
import { SHORTLIST_FEE_MESSAGES } from "../shortlist-fee.constants";

/**
 * Flat-referral display data for the recruiter dialogs. All amounts are
 * computed server-side so the client only renders them.
 */
export interface FlatBreakdown {
  /** Recruiter-entered flat referral fee. */
  flatReferralFee: number;
  /** Full flat fee incl. Stripe + application fees (one clean charge). */
  fullChargeWithFees: number;
  /** True if this candidate's referral fee has already been charged. */
  thisCandidateAlreadyCharged: boolean;
  /**
   * The REFERRAL FEE charged when this candidate is moved to Hired: the full
   * fee, or 0 if already charged. Legacy jobs that captured a deposit under the
   * old shortlist-deposit model credit it against the job's first hire. This is
   * only the first of the two Stripe charges at hire — see `totalDueAtHire`.
   */
  amountDueAtHire: number;
  /** The job's success fee (raw, not grossed up). 0 when the job has none. */
  successFeeAmount: number;
  /** True if this candidate's success fee has already been captured. */
  successFeeAlreadyCharged: boolean;
  /**
   * The SUCCESS FEE charged when this candidate is moved to Hired — a second,
   * separate Stripe charge. 0 when the job has no success fee or it is already
   * captured. Mirrors the skip condition in `captureSuccessFeePayment`.
   */
  successFeeDueAtHire: number;
  /**
   * What the recruiter's card will ACTUALLY be charged at hire:
   * `amountDueAtHire + successFeeDueAtHire`. Use this for any figure shown to
   * the recruiter before they confirm — the two legs are separate PaymentIntents
   * but land on the card together.
   */
  totalDueAtHire: number;
}

export interface ShortlistBreakdownResult {
  jobTitle: string;
  candidateLabel: string;
  bountyAmount: number;
  providerFee: number;
  processingFee: number;
  totalAmount: number;
  paymentMethod: { brand: string; last4: string } | null;
  /** Days the candidate must stay before the success fee is released. */
  probationPeriodDays: number | null;
  flat: FlatBreakdown;
}

@Injectable()
export class ShortlistBreakdownService {
  private readonly logger = new Logger(ShortlistBreakdownService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly stripeService: StripeService
  ) {}

  async getBreakdown(
    candidateId: string,
    _userId: string
  ): Promise<ShortlistBreakdownResult> {
    // 1. Fetch candidate + job + pricing
    const pricing = schema.recruitmentJobPricesSchema;

    const [candidate] = await this.db
      .select({
        id: schema.recruitmentJobCandidates.id,
        anonymousLabel: schema.recruitmentJobCandidates.anonymousLabel,
        jobId: schema.recruitmentJobCandidates.jobId,
        jobTitle: schema.recruitmentJobsSchema.title,
        bountyAmount: pricing.bountyAmount,
        providerFee: pricing.providerFee,
        processingFee: pricing.processingFee,
        totalAmount: pricing.totalAmount,
        flatReferralAmount: pricing.flatReferralAmount,
        hasSuccessFee: pricing.hasSuccessFee,
        successFeeAmount: pricing.successFeeAmount,
        probationPeriodDays: schema.recruitmentJobsSchema.probationPeriodDays,
        requesterId: schema.recruitmentJobsSchema.requesterId,
      })
      .from(schema.recruitmentJobCandidates)
      .innerJoin(
        schema.recruitmentJobsSchema,
        eq(
          schema.recruitmentJobCandidates.jobId,
          schema.recruitmentJobsSchema.id
        )
      )
      .leftJoin(
        pricing,
        eq(schema.recruitmentJobCandidates.jobId, pricing.jobId)
      )
      .where(
        and(
          eq(schema.recruitmentJobCandidates.id, candidateId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);

    if (!candidate) {
      throw new NotFoundException(
        SHORTLIST_FEE_MESSAGES.ERROR.CANDIDATE_NOT_FOUND
      );
    }

    // 2. Read pre-computed fees from pricing table
    const bountyAmount = parseFloat(candidate.bountyAmount ?? "0");
    const providerFee = parseFloat(candidate.providerFee ?? "0");
    const processingFee = parseFloat(candidate.processingFee ?? "0");
    const totalAmount = parseFloat(candidate.totalAmount ?? "0");

    // 3. Fetch recruiter's saved payment method
    let paymentMethod: { brand: string; last4: string } | null = null;

    const [recruiter] = await this.db
      .select({
        stripeCustomerId: schema.users.stripeCustomerId,
      })
      .from(schema.users)
      .where(eq(schema.users.id, candidate.requesterId))
      .limit(1);

    if (recruiter?.stripeCustomerId) {
      try {
        const methods = await this.stripeService.listPaymentMethods(
          recruiter.stripeCustomerId
        );
        if (methods.length > 0) {
          const { card } = methods[0];
          paymentMethod = {
            brand: card?.brand ?? "unknown",
            last4: card?.last4 ?? "****",
          };
        }
      } catch (error) {
        this.logger.error(
          `SHORTLIST_BREAKDOWN_SERVICE :: GET_BREAKDOWN : ERROR fetching payment methods : ${error}`
        );
      }
    }

    // 4. Flat-referral display data: what will be charged when the candidate is
    //    moved to Hired. Nothing is ever charged at shortlist.
    const flat = await this.buildFlatBreakdown({
      jobId: candidate.jobId,
      candidateId: candidate.id,
      flatReferralFee: parseFloat(candidate.flatReferralAmount ?? "0"),
      fullChargeWithFees: totalAmount,
      hasSuccessFee: candidate.hasSuccessFee ?? false,
      successFeeAmount: parseFloat(candidate.successFeeAmount ?? "0"),
    });

    return {
      jobTitle: candidate.jobTitle,
      candidateLabel: candidate.anonymousLabel ?? "Unknown",
      bountyAmount,
      providerFee,
      processingFee,
      totalAmount,
      paymentMethod,
      probationPeriodDays: candidate.probationPeriodDays ?? null,
      flat,
    };
  }

  /** True if a row of the given fee type/status exists for the job (or candidate). */
  private async existsTransaction(filters: {
    jobId?: string;
    candidateId?: string;
    transactionType: string;
    status?: string;
  }): Promise<boolean> {
    const conditions = [
      filters.jobId
        ? eq(schema.recruitmentInterviewTransactions.jobId, filters.jobId)
        : undefined,
      filters.candidateId
        ? eq(
            schema.recruitmentInterviewTransactions.candidateId,
            filters.candidateId
          )
        : undefined,
      eq(
        schema.recruitmentInterviewTransactions.transactionType,
        filters.transactionType
      ),
      filters.status
        ? eq(schema.recruitmentInterviewTransactions.status, filters.status)
        : undefined,
      isNull(schema.recruitmentInterviewTransactions.deletedAt),
    ].filter(Boolean);

    const [row] = await this.db
      .select({ id: schema.recruitmentInterviewTransactions.id })
      .from(schema.recruitmentInterviewTransactions)
      .where(and(...conditions))
      .limit(1);

    return !!row;
  }

  private async buildFlatBreakdown(params: {
    jobId: string;
    candidateId: string;
    flatReferralFee: number;
    fullChargeWithFees: number;
    hasSuccessFee: boolean;
    successFeeAmount: number;
  }): Promise<FlatBreakdown> {
    const {
      jobId,
      candidateId,
      flatReferralFee,
      fullChargeWithFees,
      hasSuccessFee,
      successFeeAmount,
    } = params;

    const [
      capturedDeposit,
      anyJobInterviewCharged,
      thisCandidateCharged,
      successFeeAlreadyCharged,
    ] = await Promise.all([
      getCapturedFlatDepositAmount(this.db, jobId),
      this.existsTransaction({
        jobId,
        transactionType: RECRUITMENT_INTERVIEW_TXN_TYPE.INTERVIEW_COST,
        status: RECRUITMENT_INTERVIEW_TXN_STATUS.CAPTURED,
      }),
      this.existsTransaction({
        candidateId,
        transactionType: RECRUITMENT_INTERVIEW_TXN_TYPE.INTERVIEW_COST,
      }),
      // A captured `success_fee` row always carries an intentId — the charge
      // service returns before writing when the job has no success fee — so a
      // captured row is exactly the condition that makes it skip on retry.
      this.existsTransaction({
        candidateId,
        transactionType: RECRUITMENT_INTERVIEW_TXN_TYPE.SUCCESS_FEE,
        status: RECRUITMENT_INTERVIEW_TXN_STATUS.CAPTURED,
      }),
    ]);

    // Nothing is charged at shortlist, so the first candidate of the job to be
    // charged (at hire) normally pays the full fee — `capturedDeposit` is 0.
    // LEGACY ONLY: jobs that captured a deposit under the old shortlist-deposit
    // model credit it against the job's first hire, so that hire pays the
    // remainder. The credit reads the deposit ACTUALLY captured, so this display
    // matches what the hire charge bills even after a mid-pipeline fee edit, and
    // the two captures always sum to `fullChargeWithFees` (the latest total).
    // Clamp to $0 for a fee lowered below the captured deposit (no refund),
    // matching the charge path.
    const remainder = Math.max(
      0,
      Math.round((fullChargeWithFees - capturedDeposit) * 100) / 100
    );
    let amountDueAtHire = remainder;
    if (thisCandidateCharged) {
      amountDueAtHire = 0;
    } else if (anyJobInterviewCharged) {
      amountDueAtHire = fullChargeWithFees;
    }

    // Second leg of the hire charge. Mirrors the skip condition in
    // `InterviewBookingSuccessFeePaymentService.captureSuccessFeePayment`
    // (`!hasSuccessFee || !successFeeAmount`) plus its captured-row idempotency,
    // so this figure matches what Stripe is actually asked for. The success fee
    // is charged RAW — unlike the referral fee it is not grossed up for Stripe
    // and application fees.
    const successFeeDueAtHire =
      hasSuccessFee && successFeeAmount > 0 && !successFeeAlreadyCharged
        ? successFeeAmount
        : 0;

    // The two legs are separate PaymentIntents but hit the card together, so
    // any recruiter-facing "you will be charged" figure must use this total.
    const totalDueAtHire =
      Math.round((amountDueAtHire + successFeeDueAtHire) * 100) / 100;

    return {
      flatReferralFee,
      fullChargeWithFees,
      thisCandidateAlreadyCharged: thisCandidateCharged,
      amountDueAtHire,
      successFeeAmount,
      successFeeAlreadyCharged,
      successFeeDueAtHire,
      totalDueAtHire,
    };
  }
}
