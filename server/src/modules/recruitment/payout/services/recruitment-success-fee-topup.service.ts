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
} from "../recruitment-payout.constants";

// User-facing message when the top-up charge cannot be collected. Kept generic
// (no internals) — surfaced in the Release Candidate Bonus dialog so the recruiter
// knows the bonus stayed pending because the extra charge failed.
export const SUCCESS_FEE_TOPUP_CHARGE_FAILED =
  "Your card was declined, so we couldn't collect the additional amount needed to cover the increased success fee. Nothing has been sent to the candidate. Check your payment method and try the payment again.";

export interface SuccessFeeTopUp {
  /** Latest Success Fee currently on the job's price row (paid 100% to candidate). */
  latest: number;
  /** Success fee already funded for this candidate (captured charges + top-ups). */
  funded: number;
  /** Amount the recruiter still owes to reach the latest fee; 0 when unchanged/lowered. */
  topUp: number;
}

// Computes and (when the Success Fee was raised/enabled after the candidate was
// charged) charges the recruiter the difference so the candidate is paid the
// LATEST Success Fee at release. Money math is server-authoritative — the amount
// is derived from the stored price row and the candidate's captured charges, never
// from the client. Repeated top-ups are supported: the Success Fee can be raised
// any number of times before the bonus is released, and each raise collects only
// its own delta (`latest - getFundedAmount`).
@Injectable()
export class RecruitmentSuccessFeeTopupService {
  private readonly logger = new Logger(RecruitmentSuccessFeeTopupService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly stripeService: StripeService
  ) {}

  /**
   * Read-only. Returns the latest Success Fee, the amount already funded for this
   * candidate, and the top-up owed to reach the latest fee. `null` when the job
   * has no Success Fee (nothing to reconcile). `topUp` is clamped at 0 — lowering
   * never refunds.
   */
  async computeSuccessFeeTopUp(
    db: PostgresJsDatabase<typeof schema>,
    params: { jobId: string; candidateId: string }
  ): Promise<SuccessFeeTopUp | null> {
    const [priceRow] = await db
      .select({
        hasSuccessFee: schema.recruitmentJobPricesSchema.hasSuccessFee,
        successFeeAmount: schema.recruitmentJobPricesSchema.successFeeAmount,
      })
      .from(schema.recruitmentJobPricesSchema)
      .where(
        and(
          eq(schema.recruitmentJobPricesSchema.jobId, params.jobId),
          isNull(schema.recruitmentJobPricesSchema.deletedAt)
        )
      )
      .limit(1);

    if (!priceRow?.hasSuccessFee || priceRow.successFeeAmount == null) {
      return null;
    }

    const latest = Number(priceRow.successFeeAmount);
    const funded = await this.getFundedAmount(db, params.candidateId);
    const topUp = Math.max(0, Math.round((latest - funded) * 100) / 100);

    return { latest, funded, topUp };
  }

  /**
   * What the recruiter has paid in Success Fee top-ups for this candidate, and
   * when the most recent one landed. `null` when nothing has been collected.
   * A raised fee can be topped up repeatedly, so this sums every captured row.
   *
   * `computeSuccessFeeTopUp` already reports only the outstanding shortfall (it
   * derives from `getFundedAmount`); this describes what has been collected so
   * the dialog can show "you've already paid $X".
   */
  async getFundedTopUpSummary(
    db: PostgresJsDatabase<typeof schema>,
    candidateId: string
  ): Promise<{ amount: number; paidAt: Date | null; count: number } | null> {
    const rows = await db
      .select({
        chargeAmount: schema.recruitmentInterviewTransactions.chargeAmount,
        totalAmount: schema.recruitmentInterviewTransactions.totalAmount,
        capturedAt: schema.recruitmentInterviewTransactions.capturedAt,
      })
      .from(schema.recruitmentInterviewTransactions)
      .where(
        and(
          eq(schema.recruitmentInterviewTransactions.candidateId, candidateId),
          eq(
            schema.recruitmentInterviewTransactions.transactionType,
            RECRUITMENT_INTERVIEW_TXN_TYPE.SUCCESS_FEE_TOPUP
          ),
          eq(
            schema.recruitmentInterviewTransactions.status,
            RECRUITMENT_INTERVIEW_TXN_STATUS.CAPTURED
          ),
          isNull(schema.recruitmentInterviewTransactions.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const amount =
      Math.round(
        rows.reduce(
          (acc, r) => acc + Number(r.chargeAmount ?? r.totalAmount ?? 0),
          0
        ) * 100
      ) / 100;
    const paidAt = rows.reduce<Date | null>(
      (latest, r) =>
        r.capturedAt && (!latest || r.capturedAt > latest)
          ? r.capturedAt
          : latest,
      null
    );

    return { amount, paidAt, count: rows.length };
  }

  /**
   * Charges the recruiter the top-up (create + capture, off-session) and records a
   * `success_fee_topup` transaction. Throws BadRequestException on a failed charge
   * so the caller aborts and leaves the bonus pending.
   *
   * Repeat-safe rather than once-only: the caller passes the shortfall from
   * `computeSuccessFeeTopUp`, which already nets off everything funded, and
   * `targetTotal` (the fee level this charge funds up to) keys the Stripe
   * idempotency token per raise.
   */
  async chargeSuccessFeeTopUpIfNeeded(params: {
    candidateId: string;
    jobId: string;
    recruiterId: string;
    topUp: number;
    /** The Success Fee level this charge funds the candidate up to. */
    targetTotal: number;
  }): Promise<{ charged: boolean }> {
    const { candidateId, jobId, recruiterId, topUp, targetTotal } = params;

    if (topUp <= 0) return { charged: false };

    // Attribute the top-up to the candidate's connector, same as the booking-time
    // success_fee charge (which copies connectorUserId off the interview_cost row).
    const [interviewCostTxn] = await this.db
      .select({
        connectorUserId:
          schema.recruitmentInterviewTransactions.connectorUserId,
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
    const connectorUserId = interviewCostTxn?.connectorUserId ?? null;

    const [recruiter] = await this.db
      .select({
        stripeCustomerId: schema.users.stripeCustomerId,
        stripePrimaryPaymentMethodId: schema.users.stripePrimaryPaymentMethodId,
      })
      .from(schema.users)
      .where(eq(schema.users.id, recruiterId))
      .limit(1);

    if (
      !recruiter?.stripeCustomerId ||
      !recruiter.stripePrimaryPaymentMethodId
    ) {
      throw new BadRequestException(SUCCESS_FEE_TOPUP_CHARGE_FAILED);
    }

    const now = toUTC();
    let intent;
    try {
      intent = await this.stripeService.createAndCaptureNow(
        convertToCents(topUp),
        STRIPE_CURRENCY,
        recruiter.stripeCustomerId,
        recruiter.stripePrimaryPaymentMethodId,
        {
          candidateId,
          jobId,
          recruiterId,
          type: "recruitment_success_fee_topup",
        },
        // Keyed on the fee level being funded, not just the candidate: retrying
        // the same raise replays one PaymentIntent, while a later raise is a
        // genuinely different key. A racing second Pay click gets the SAME intent
        // back and loses on the uniq_intent_id insert.
        `recruitment-success-fee-topup-${candidateId}-${convertToCents(targetTotal)}`
      );

      if (intent.status !== "succeeded") {
        throw new BadRequestException(SUCCESS_FEE_TOPUP_CHARGE_FAILED);
      }
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_SUCCESS_FEE_TOPUP :: chargeSuccessFeeTopUpIfNeeded : ERROR : ${error}`
      );
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(SUCCESS_FEE_TOPUP_CHARGE_FAILED);
    }

    const charge = intent.latest_charge;
    const receiptUrl =
      typeof charge === "object" && charge !== null ? charge.receipt_url : null;

    try {
      await this.db.insert(schema.recruitmentInterviewTransactions).values({
        candidateId,
        jobId,
        recruiterId,
        connectorUserId,
        transactionType: RECRUITMENT_INTERVIEW_TXN_TYPE.SUCCESS_FEE_TOPUP,
        totalAmount: topUp.toFixed(2),
        intentId: intent.id,
        paymentMethodId: recruiter.stripePrimaryPaymentMethodId,
        chargeAmount: String(intent.amount_received / 100),
        receiptUrl,
        status: RECRUITMENT_INTERVIEW_TXN_STATUS.CAPTURED,
        authorizedAt: now,
        capturedAt: now,
        createdAt: now,
        updatedAt: now,
        createdBy: recruiterId,
        updatedBy: recruiterId,
      });
    } catch (error) {
      // A concurrent release lost the race: it charged the SAME PaymentIntent
      // (deduped by the idempotency key above) and its INSERT now collides on
      // uniq_interview_txn_intent_id. Treat as already-charged, not a 500.
      if (
        error != null &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
      ) {
        this.logger.debug(
          `RECRUITMENT_SUCCESS_FEE_TOPUP :: chargeSuccessFeeTopUpIfNeeded : concurrent top-up row already exists for candidate ${candidateId}`
        );
        return { charged: false };
      }
      throw error;
    }

    return { charged: true };
  }

  /**
   * Sum of the Success Fee actually funded for a candidate: captured `success_fee`
   * charge + any captured `success_fee_topup`. `0` when the fee was enabled after
   * this candidate was booked (no charge was ever taken).
   */
  async getFundedAmount(
    db: PostgresJsDatabase<typeof schema>,
    candidateId: string
  ): Promise<number> {
    const rows = await db
      .select({
        chargeAmount: schema.recruitmentInterviewTransactions.chargeAmount,
        totalAmount: schema.recruitmentInterviewTransactions.totalAmount,
      })
      .from(schema.recruitmentInterviewTransactions)
      .where(
        and(
          eq(schema.recruitmentInterviewTransactions.candidateId, candidateId),
          inArray(schema.recruitmentInterviewTransactions.transactionType, [
            RECRUITMENT_INTERVIEW_TXN_TYPE.SUCCESS_FEE,
            RECRUITMENT_INTERVIEW_TXN_TYPE.SUCCESS_FEE_TOPUP,
          ]),
          eq(
            schema.recruitmentInterviewTransactions.status,
            RECRUITMENT_INTERVIEW_TXN_STATUS.CAPTURED
          ),
          isNull(schema.recruitmentInterviewTransactions.deletedAt)
        )
      );

    return rows.reduce(
      (sum, r) => sum + Number(r.chargeAmount ?? r.totalAmount ?? 0),
      0
    );
  }
}
