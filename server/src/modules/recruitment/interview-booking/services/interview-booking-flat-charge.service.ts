import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { StripeService } from "modules/stripe/stripe.service";
import { convertToCents } from "modules/payments/utils/payment-calculations.util";
import { STRIPE_CURRENCY } from "config/payment.config";
import {
  RECRUITMENT_INTERVIEW_TXN_TYPE,
  RECRUITMENT_INTERVIEW_TXN_STATUS,
} from "modules/recruitment/payout/recruitment-payout.constants";
import { getCapturedFlatDepositAmount } from "modules/recruitment/interview-cost/flat-deposit.utils";
import { INTERVIEW_BOOKING_MESSAGES } from "../interview-booking.constants";

export interface FlatInterviewChargeResult {
  success: boolean;
  alreadyCharged: boolean;
  intentId: string;
  amountDollars: number;
}

// Owns the recruiter-side flat-referral charge at interview scheduling. For a
// flat_referral job nothing is authorized at shortlist (only the one-time
// deposit is captured there), so this path is a create + capture, not a capture
// of a prior authorization. The FIRST candidate of the job to reach scheduling
// is charged the remainder (total − deposit); every subsequent scheduled
// candidate is charged the full flat fee. The resulting interview_cost row is
// what the payout flow reads to fund the connector payout (grossAmount =
// bountyAmount = flat referral amount), so this mirrors per-interview downstream.
//
// Kept as its own service so the flat charge path has its own
// failure surface; a failure throws BadRequestException so the caller blocks
// the booking confirmation.
@Injectable()
export class InterviewBookingFlatChargeService {
  private readonly logger = new Logger(InterviewBookingFlatChargeService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly stripeService: StripeService
  ) {}

  async chargeFlatInterviewFee(
    candidateId: string
  ): Promise<FlatInterviewChargeResult> {
    // 1. Resolve job + pricing + acting connector snapshot for this candidate.
    const pricing = schema.recruitmentJobPricesSchema;
    const [row] = await this.db
      .select({
        jobId: schema.recruitmentJobCandidates.jobId,
        recruiterId: schema.recruitmentJobsSchema.requesterId,
        connectorUserId: schema.recruitmentCandidateConnectors.connectorUserId,
        totalAmount: pricing.totalAmount,
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
      .leftJoin(
        schema.recruitmentCandidateConnectors,
        and(
          eq(
            schema.recruitmentCandidateConnectors.candidateId,
            schema.recruitmentJobCandidates.id
          ),
          inArray(schema.recruitmentCandidateConnectors.role, [
            "primary",
            "claimer",
          ]),
          isNull(schema.recruitmentCandidateConnectors.deletedAt)
        )
      )
      .where(
        and(
          eq(schema.recruitmentJobCandidates.id, candidateId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);

    if (!row) {
      throw new BadRequestException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.NO_TRANSACTION_FOUND
      );
    }

    // 2. Idempotency: if this candidate already has an interview_cost row,
    //    the flat fee was already charged — return without re-charging.
    const [existing] = await this.db
      .select({
        intentId: schema.recruitmentInterviewTransactions.intentId,
        chargeAmount: schema.recruitmentInterviewTransactions.chargeAmount,
      })
      .from(schema.recruitmentInterviewTransactions)
      .where(
        and(
          eq(schema.recruitmentInterviewTransactions.candidateId, candidateId),
          eq(
            schema.recruitmentInterviewTransactions.transactionType,
            RECRUITMENT_INTERVIEW_TXN_TYPE.INTERVIEW_COST
          ),
          isNull(schema.recruitmentInterviewTransactions.deletedAt)
        )
      )
      .limit(1);

    if (existing?.intentId) {
      return {
        success: true,
        alreadyCharged: true,
        intentId: existing.intentId,
        amountDollars: Number(existing.chargeAmount ?? 0),
      };
    }

    // 3. Recruiter Stripe credentials.
    const [recruiter] = await this.db
      .select({
        stripeCustomerId: schema.users.stripeCustomerId,
        stripePrimaryPaymentMethodId: schema.users.stripePrimaryPaymentMethodId,
      })
      .from(schema.users)
      .where(eq(schema.users.id, row.recruiterId))
      .limit(1);

    if (
      !recruiter?.stripeCustomerId ||
      !recruiter.stripePrimaryPaymentMethodId
    ) {
      throw new BadRequestException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.PAYMENT_CAPTURE_FAILED
      );
    }

    // 4. Determine the amount. Shortlisting is free, so the whole flat fee is
    //    captured here — `getCapturedFlatDepositAmount` returns 0 and every hire
    //    pays the full total.
    //
    //    LEGACY ONLY: jobs that captured a deposit under the removed
    //    shortlist-deposit model still carry a `flat_deposit` row. For those, the
    //    first candidate of the job to reach hire pays the remainder (latest
    //    total − the deposit ACTUALLY captured) so the recruiter is never
    //    double-charged; every later candidate pays the full flat fee. Reading
    //    the real captured deposit (not the pricing snapshot) keeps the two
    //    captures summing to the latest fee even after the recruiter edits the
    //    Flat Referral Fee mid-pipeline. If the fee was lowered below what was
    //    already captured, the remainder clamps to $0 (no refund).
    const total = parseFloat(row.totalAmount ?? "0");
    const capturedDeposit = await getCapturedFlatDepositAmount(
      this.db,
      row.jobId
    );

    const [priorCapturedCharge] = await this.db
      .select({ id: schema.recruitmentInterviewTransactions.id })
      .from(schema.recruitmentInterviewTransactions)
      .where(
        and(
          eq(schema.recruitmentInterviewTransactions.jobId, row.jobId),
          eq(
            schema.recruitmentInterviewTransactions.transactionType,
            RECRUITMENT_INTERVIEW_TXN_TYPE.INTERVIEW_COST
          ),
          eq(
            schema.recruitmentInterviewTransactions.status,
            RECRUITMENT_INTERVIEW_TXN_STATUS.CAPTURED
          ),
          isNull(schema.recruitmentInterviewTransactions.deletedAt)
        )
      )
      .limit(1);

    const isFirstToSchedule = !priorCapturedCharge;
    const amountDollars = isFirstToSchedule
      ? Math.max(0, Math.round((total - capturedDeposit) * 100) / 100)
      : total;

    const now = toUTC();

    // 5. Zero-remainder path: the deposit already covers (or exceeds) the latest
    //    total, so there is nothing left to charge. Skip Stripe entirely, but
    //    still record the interview_cost row so hire completes idempotently and
    //    the connector payout funds from the (latest) bountyAmount.
    if (amountDollars <= 0) {
      await this.db.insert(schema.recruitmentInterviewTransactions).values({
        candidateId,
        jobId: row.jobId,
        recruiterId: row.recruiterId,
        connectorUserId: row.connectorUserId,
        transactionType: RECRUITMENT_INTERVIEW_TXN_TYPE.INTERVIEW_COST,
        totalAmount: "0.00",
        intentId: null,
        paymentMethodId: recruiter.stripePrimaryPaymentMethodId,
        chargeAmount: "0.00",
        receiptUrl: null,
        status: RECRUITMENT_INTERVIEW_TXN_STATUS.CAPTURED,
        authorizedAt: now,
        capturedAt: now,
        createdAt: now,
        updatedAt: now,
        createdBy: row.recruiterId,
        updatedBy: row.recruiterId,
      });

      return {
        success: true,
        alreadyCharged: false,
        intentId: "",
        amountDollars: 0,
      };
    }

    const amountCents = convertToCents(amountDollars);

    // 6. Charge immediately (create + capture, off-session).
    let intent;
    try {
      intent = await this.stripeService.createAndCaptureNow(
        amountCents,
        STRIPE_CURRENCY,
        recruiter.stripeCustomerId,
        recruiter.stripePrimaryPaymentMethodId,
        {
          candidateId,
          jobId: row.jobId,
          recruiterId: row.recruiterId,
          type: "recruitment_flat_interview_capture",
        }
      );

      if (intent.status !== "succeeded") {
        throw new BadRequestException(
          INTERVIEW_BOOKING_MESSAGES.ERROR.PAYMENT_CAPTURE_FAILED
        );
      }
    } catch (error) {
      this.logger.error(
        `INTERVIEW_BOOKING_FLAT_CHARGE :: chargeFlatInterviewFee : ERROR : ${error}`
      );
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.PAYMENT_CAPTURE_FAILED
      );
    }

    // 7. Persist the captured interview_cost row. paymentMethodId is stored so
    //    the success-fee path (which reads it off the interview_cost row) keeps
    //    working for flat jobs. The unique (candidate_id, transaction_type)
    //    index protects against a duplicate insert on retry.
    const charge = intent.latest_charge;
    const receiptUrl =
      typeof charge === "object" && charge !== null ? charge.receipt_url : null;

    await this.db.insert(schema.recruitmentInterviewTransactions).values({
      candidateId,
      jobId: row.jobId,
      recruiterId: row.recruiterId,
      connectorUserId: row.connectorUserId,
      transactionType: RECRUITMENT_INTERVIEW_TXN_TYPE.INTERVIEW_COST,
      totalAmount: amountDollars.toFixed(2),
      intentId: intent.id,
      paymentMethodId: recruiter.stripePrimaryPaymentMethodId,
      chargeAmount: String(intent.amount_received / 100),
      receiptUrl,
      status: RECRUITMENT_INTERVIEW_TXN_STATUS.CAPTURED,
      authorizedAt: now,
      capturedAt: now,
      createdAt: now,
      updatedAt: now,
      createdBy: row.recruiterId,
      updatedBy: row.recruiterId,
    });

    return {
      success: true,
      alreadyCharged: false,
      intentId: intent.id,
      amountDollars,
    };
  }
}
