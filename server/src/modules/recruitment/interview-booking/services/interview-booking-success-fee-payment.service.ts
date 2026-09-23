import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { StripeService } from "modules/stripe/stripe.service";
import { STRIPE_CURRENCY } from "config/payment.config";
import {
  RECRUITMENT_INTERVIEW_TXN_TYPE,
  RECRUITMENT_INTERVIEW_TXN_STATUS,
} from "modules/recruitment/payout/recruitment-payout.constants";
import { INTERVIEW_BOOKING_MESSAGES } from "../interview-booking.constants";

export interface SuccessFeeCaptureResult {
  success: boolean;
  successFeeIntentId: string;
  amountDollars: number;
}

// Owns the candidate-bonus (success-fee) charge + reconciliation flow.
// Kept as its own service so each transaction type has
// its own failure surface and the bounty/interview-cost path stays focused.
//
// One success-fee row per candidate is enforced by the
// uniq_interview_txn_candidate_type partial index. Returns null when the job
// has no success fee. Throws BadRequestException on capture failure so the
// caller can roll back the outer booking transaction.
@Injectable()
export class InterviewBookingSuccessFeePaymentService {
  private readonly logger = new Logger(
    InterviewBookingSuccessFeePaymentService.name
  );

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly stripeService: StripeService
  ) {}

  async captureSuccessFeePayment(
    candidateId: string
  ): Promise<SuccessFeeCaptureResult | null> {
    // 1. Resolve the bounty row (for jobId/recruiterId/paymentMethod) +
    //    job pricing (success-fee config).
    const [row] = await this.db
      .select({
        jobId: schema.recruitmentInterviewTransactions.jobId,
        recruiterId: schema.recruitmentInterviewTransactions.recruiterId,
        connectorUserId:
          schema.recruitmentInterviewTransactions.connectorUserId,
        paymentMethodId:
          schema.recruitmentInterviewTransactions.paymentMethodId,
        hasSuccessFee: schema.recruitmentJobPricesSchema.hasSuccessFee,
        successFeeAmount: schema.recruitmentJobPricesSchema.successFeeAmount,
      })
      .from(schema.recruitmentInterviewTransactions)
      .innerJoin(
        schema.recruitmentJobPricesSchema,
        eq(
          schema.recruitmentInterviewTransactions.jobId,
          schema.recruitmentJobPricesSchema.jobId
        )
      )
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

    if (!row) {
      throw new BadRequestException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.NO_TRANSACTION_FOUND
      );
    }

    if (!row.hasSuccessFee || !row.successFeeAmount) {
      return null;
    }

    // 2. Idempotency: if a success-fee row already exists and is captured,
    //    return its intent without re-charging the recruiter.
    const [existingSuccessFeeRow] = await this.db
      .select({
        id: schema.recruitmentInterviewTransactions.id,
        intentId: schema.recruitmentInterviewTransactions.intentId,
        status: schema.recruitmentInterviewTransactions.status,
      })
      .from(schema.recruitmentInterviewTransactions)
      .where(
        and(
          eq(schema.recruitmentInterviewTransactions.candidateId, candidateId),
          eq(
            schema.recruitmentInterviewTransactions.transactionType,
            RECRUITMENT_INTERVIEW_TXN_TYPE.SUCCESS_FEE
          ),
          isNull(schema.recruitmentInterviewTransactions.deletedAt)
        )
      )
      .limit(1);

    if (
      existingSuccessFeeRow?.status ===
        RECRUITMENT_INTERVIEW_TXN_STATUS.CAPTURED &&
      existingSuccessFeeRow.intentId
    ) {
      return {
        success: true,
        successFeeIntentId: existingSuccessFeeRow.intentId,
        amountDollars: Number(row.successFeeAmount),
      };
    }

    // 3. Fetch recruiter's stripeCustomerId
    const [recruiter] = await this.db
      .select({ stripeCustomerId: schema.users.stripeCustomerId })
      .from(schema.users)
      .where(eq(schema.users.id, row.recruiterId))
      .limit(1);

    if (!recruiter?.stripeCustomerId || !row.paymentMethodId) {
      throw new BadRequestException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.PAYMENT_CAPTURE_FAILED
      );
    }

    const amountDollars = Number(row.successFeeAmount);
    const amountCents = Math.round(amountDollars * 100);
    const now = toUTC();

    let intent;
    try {
      intent = await this.stripeService.createAndCaptureNow(
        amountCents,
        STRIPE_CURRENCY,
        recruiter.stripeCustomerId,
        row.paymentMethodId,
        {
          candidateId,
          recruiterId: row.recruiterId,
          type: "recruitment_success_fee_capture",
        }
      );

      if (intent.status !== "succeeded") {
        throw new BadRequestException(
          INTERVIEW_BOOKING_MESSAGES.ERROR.PAYMENT_CAPTURE_FAILED
        );
      }
    } catch (error) {
      this.logger.error(
        `INTERVIEW_BOOKING_SUCCESS_FEE_PAYMENT :: captureSuccessFeePayment : ERROR : ${error}`
      );

      // Best-effort: record the failed attempt as its own row (or update the
      // existing pre-existing row if one was present from a prior failure).
      const failureMessage = (error as Error)?.message || String(error);
      if (existingSuccessFeeRow) {
        await this.db
          .update(schema.recruitmentInterviewTransactions)
          .set({
            status: RECRUITMENT_INTERVIEW_TXN_STATUS.FAILED,
            paymentError: failureMessage,
            updatedAt: now,
          })
          .where(
            eq(
              schema.recruitmentInterviewTransactions.id,
              existingSuccessFeeRow.id
            )
          );
      } else {
        await this.db
          .insert(schema.recruitmentInterviewTransactions)
          .values({
            candidateId,
            jobId: row.jobId,
            recruiterId: row.recruiterId,
            connectorUserId: row.connectorUserId,
            transactionType: RECRUITMENT_INTERVIEW_TXN_TYPE.SUCCESS_FEE,
            totalAmount: amountDollars.toFixed(2),
            paymentMethodId: row.paymentMethodId,
            status: RECRUITMENT_INTERVIEW_TXN_STATUS.FAILED,
            paymentError: failureMessage,
            createdAt: now,
            updatedAt: now,
            createdBy: row.recruiterId,
            updatedBy: row.recruiterId,
          })
          .onConflictDoNothing();
      }

      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        INTERVIEW_BOOKING_MESSAGES.ERROR.PAYMENT_CAPTURE_FAILED
      );
    }

    // 4. Persist the captured success-fee row. Update if a prior failed row
    //    exists, otherwise insert. The unique partial index on
    //    (candidate_id, transaction_type) prevents accidental duplicates.
    //
    //    Stripe returns the charge URL (`receipt_url`) on the latest charge of
    //    the captured PI. Mirror what the bounty path does so the recruiter
    //    has a working receipt link for the success-fee charge too.
    const successFeeCharge = intent.latest_charge;
    const successFeeReceiptUrl =
      typeof successFeeCharge === "object" && successFeeCharge !== null
        ? successFeeCharge.receipt_url
        : null;

    if (existingSuccessFeeRow) {
      await this.db
        .update(schema.recruitmentInterviewTransactions)
        .set({
          intentId: intent.id,
          totalAmount: amountDollars.toFixed(2),
          chargeAmount: String(intent.amount_received / 100),
          receiptUrl: successFeeReceiptUrl,
          status: RECRUITMENT_INTERVIEW_TXN_STATUS.CAPTURED,
          authorizedAt: now,
          capturedAt: now,
          paymentError: null,
          updatedAt: now,
          updatedBy: row.recruiterId,
        })
        .where(
          eq(
            schema.recruitmentInterviewTransactions.id,
            existingSuccessFeeRow.id
          )
        );
    } else {
      await this.db.insert(schema.recruitmentInterviewTransactions).values({
        candidateId,
        jobId: row.jobId,
        recruiterId: row.recruiterId,
        connectorUserId: row.connectorUserId,
        transactionType: RECRUITMENT_INTERVIEW_TXN_TYPE.SUCCESS_FEE,
        totalAmount: amountDollars.toFixed(2),
        intentId: intent.id,
        paymentMethodId: row.paymentMethodId,
        chargeAmount: String(intent.amount_received / 100),
        receiptUrl: successFeeReceiptUrl,
        status: RECRUITMENT_INTERVIEW_TXN_STATUS.CAPTURED,
        authorizedAt: now,
        capturedAt: now,
        createdAt: now,
        updatedAt: now,
        createdBy: row.recruiterId,
        updatedBy: row.recruiterId,
      });
    }

    return {
      success: true,
      successFeeIntentId: intent.id,
      amountDollars,
    };
  }
}
