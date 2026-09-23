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
import { convertToCents } from "modules/payments/utils/payment-calculations.util";
import { STRIPE_CURRENCY } from "config/payment.config";
import { FlatReferralFeeService } from "../../interview-cost/services/flat-referral-fee.service";
import {
  RECRUITMENT_INTERVIEW_TXN_TYPE,
  RECRUITMENT_INTERVIEW_TXN_STATUS,
} from "../recruitment-payout.constants";

// User-facing message when the top-up charge cannot be collected. Kept generic
// (no internals) — surfaced in the Release Payout dialog so the recruiter knows
// the payout stayed pending because the extra charge failed.
export const FLAT_TOPUP_CHARGE_FAILED =
  "Your card was declined, so we couldn't collect the additional amount needed to cover the increased referral fee. Nothing has been sent to the connector. Check your payment method and try the payment again.";

export interface FlatTopUp {
  /** Latest Flat Referral Fee (base) currently on the job's price row. */
  currentFee: number;
  /** total() at the fee this candidate was originally charged (from the snapshot). */
  oldTotal: number;
  /** total() at the current fee — the fee level this candidate must be funded to. */
  newTotal: number;
  /** oldTotal + every top-up already collected. The high-water mark. */
  fundedTotal: number;
  /** Rounded difference HR still owes; 0 when the fee is unchanged or lowered. */
  topUp: number;
}

// Computes and (when the fee was raised) charges the recruiter the difference
// needed so an already-hired candidate's connector is paid at the LATEST Flat
// Referral Fee. Money math is server-authoritative — the amount is derived from
// the stored price row and the payout's own snapshot, never from the client.
//
// Repeated top-ups are supported: the fee can be raised any number of times
// before the payout is released, and each raise collects only its own delta.
// `funded` is tracked at the FEE level — total(fee at hire) + every top-up taken
// since — which keeps the legacy job-scoped `flat_deposit` out of the
// arithmetic, so it can never be credited to the wrong candidate.
@Injectable()
export class RecruitmentFlatTopupService {
  private readonly logger = new Logger(RecruitmentFlatTopupService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly stripeService: StripeService,
    private readonly flatReferralFeeService: FlatReferralFeeService
  ) {}

  /**
   * Read-only. Returns the top-up owed to bring `oldBaseFee` (the fee the
   * candidate was charged at, taken from the payout row's `grossAmount` snapshot)
   * up to the job's current Flat Referral Fee. `null` when the job has no priced
   * referral fee (nothing to reconcile).
   *
   * Both totals are recomputed with the current fee config via the single source
   * of truth (`FlatReferralFeeService`), the same assumption the fee-edit path
   * makes — fee config is effectively static, so `total(oldBaseFee)` matches what
   * was originally charged.
   */
  async computeTopUp(
    db: PostgresJsDatabase<typeof schema>,
    params: { jobId: string; candidateId: string; oldBaseFee: number }
  ): Promise<FlatTopUp | null> {
    const [priceRow] = await db
      .select({
        flatReferralAmount:
          schema.recruitmentJobPricesSchema.flatReferralAmount,
      })
      .from(schema.recruitmentJobPricesSchema)
      .where(
        and(
          eq(schema.recruitmentJobPricesSchema.jobId, params.jobId),
          isNull(schema.recruitmentJobPricesSchema.deletedAt)
        )
      )
      .limit(1);

    if (priceRow?.flatReferralAmount == null) {
      return null;
    }

    const currentFee = Number(priceRow.flatReferralAmount);
    // calculateFlatReferralFee throws on <= 0, and a missing snapshot reaches
    // here as 0 — a candidate with no recorded hire fee is simply unfunded.
    const [oldTotal, newBreakdown, collected] = await Promise.all([
      params.oldBaseFee > 0
        ? this.flatReferralFeeService
            .calculateFlatReferralFee(params.oldBaseFee)
            .then((b) => b.total)
        : Promise.resolve(0),
      this.flatReferralFeeService.calculateFlatReferralFee(currentFee),
      this.sumCapturedTopUps(db, params.candidateId),
    ]);

    const newTotal = newBreakdown.total;
    // High-water mark: what this candidate has been funded to across the hire
    // charge and every top-up since. Only the shortfall is ever charged, so a
    // second raise collects total(newFee) - total(previousFee), not the whole
    // delta from the hire fee.
    const fundedTotal = Math.round((oldTotal + collected) * 100) / 100;
    const topUp = this.flatReferralFeeService.roundTopUpDiff(
      newTotal,
      fundedTotal
    );

    return { currentFee, oldTotal, newTotal, fundedTotal, topUp };
  }

  /**
   * Read-only. Every `flat_topup` collected for this candidate. A fee can be
   * raised repeatedly before the payout is released, so there may be several.
   * Only CAPTURED rows count as funded.
   */
  private async listCapturedTopUps(
    db: PostgresJsDatabase<typeof schema>,
    candidateId: string
  ) {
    return db
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
            RECRUITMENT_INTERVIEW_TXN_TYPE.FLAT_TOPUP
          ),
          eq(
            schema.recruitmentInterviewTransactions.status,
            RECRUITMENT_INTERVIEW_TXN_STATUS.CAPTURED
          ),
          isNull(schema.recruitmentInterviewTransactions.deletedAt)
        )
      );
  }

  /**
   * Total already collected in top-ups for this candidate. Mirrors
   * `RecruitmentSuccessFeeTopupService.getFundedAmount`.
   */
  async sumCapturedTopUps(
    db: PostgresJsDatabase<typeof schema>,
    candidateId: string
  ): Promise<number> {
    const rows = await this.listCapturedTopUps(db, candidateId);
    const sum = rows.reduce(
      (acc, r) => acc + Number(r.chargeAmount ?? r.totalAmount ?? 0),
      0
    );
    return Math.round(sum * 100) / 100;
  }

  /**
   * What the recruiter has paid in top-ups for this candidate, and when the most
   * recent one landed. `null` when nothing has been collected. Feeds the dialog's
   * "you've already paid $X" line.
   */
  async getFundedTopUpSummary(
    db: PostgresJsDatabase<typeof schema>,
    candidateId: string
  ): Promise<{ amount: number; paidAt: Date | null; count: number } | null> {
    const rows = await this.listCapturedTopUps(db, candidateId);
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
   * Charges the recruiter the top-up (create + capture, off-session) and records
   * a `flat_topup` transaction row. Throws BadRequestException on a failed charge
   * so the caller aborts and leaves the payout pending. `recruiterId` is the
   * job's payer (requester), matching the payer on the candidate's interview_cost
   * charge.
   *
   * Repeat-safe rather than once-only: the caller passes the shortfall computed
   * by `computeTopUp`, which already nets off everything collected so far, and
   * `targetTotal` (the fee level this charge funds up to) makes the Stripe
   * idempotency key stable per raise. Retrying the same raise replays the same
   * PaymentIntent; a NEW raise gets a new key and is charged.
   */
  async chargeTopUpIfNeeded(params: {
    candidateId: string;
    jobId: string;
    recruiterId: string;
    connectorUserId: string | null;
    topUp: number;
    /** total() at the fee this charge funds the candidate up to. */
    targetTotal: number;
  }): Promise<{ charged: boolean }> {
    const {
      candidateId,
      jobId,
      recruiterId,
      connectorUserId,
      topUp,
      targetTotal,
    } = params;

    if (topUp <= 0) return { charged: false };

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
      throw new BadRequestException(FLAT_TOPUP_CHARGE_FAILED);
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
          type: "recruitment_flat_referral_topup",
        },
        // Keyed on the fee level being funded, not just the candidate: retrying
        // the same raise replays one PaymentIntent (never a double charge),
        // while a later raise is a genuinely different key. A racing second Pay
        // click gets the SAME intent back and loses on the uniq_intent_id insert.
        `recruitment-flat-topup-${candidateId}-${convertToCents(targetTotal)}`
      );

      if (intent.status !== "succeeded") {
        throw new BadRequestException(FLAT_TOPUP_CHARGE_FAILED);
      }
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_FLAT_TOPUP :: chargeTopUpIfNeeded : ERROR : ${error}`
      );
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(FLAT_TOPUP_CHARGE_FAILED);
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
        transactionType: RECRUITMENT_INTERVIEW_TXN_TYPE.FLAT_TOPUP,
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
      // A concurrent request lost the race: it charged the SAME PaymentIntent
      // (deduped by the idempotency key above) and its INSERT now collides with
      // the winner's row on uniq_interview_txn_intent_id. Treat as
      // already-charged rather than a 500 — the payout can still release.
      if (
        error != null &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
      ) {
        this.logger.debug(
          `RECRUITMENT_FLAT_TOPUP :: chargeTopUpIfNeeded : concurrent top-up row already exists for candidate ${candidateId}`
        );
        return { charged: false };
      }
      throw error;
    }

    return { charged: true };
  }
}
