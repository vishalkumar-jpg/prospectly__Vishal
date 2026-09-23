import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger, Inject } from "@nestjs/common";
import { Job } from "bullmq";
import Stripe from "stripe";
import { ProfilesService } from "modules/profiles/profiles.service";
import { CreditBalanceHelper } from "modules/credits/helpers/credit-balance.helper";
import { CREDIT_TRANSACTION_TYPES } from "modules/credits/credits.constants";
import {
  convertToCents,
  convertToDollars,
} from "modules/payments/utils/payment-calculations.util";
import { calculatePayoutFees } from "modules/payments/utils/payout-fees.util";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq, and, isNull, ne, not, inArray } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import {
  RECRUITMENT_PAYOUT_QUEUE_NAME,
  RECRUITMENT_PROCESSING_STATUS,
  RECRUITMENT_PAYOUT_STATUS,
  RECRUITMENT_PAYOUT_TYPE,
  RECRUITMENT_INTERVIEW_TXN_TYPE,
  RECRUITMENT_INTERVIEW_TXN_STATUS,
} from "modules/recruitment/payout/recruitment-payout.constants";
import { RecruitmentFeeConfigService } from "modules/recruitment/fee-config/recruitment-fee-config.service";
import { FlatReferralFeeService } from "modules/recruitment/interview-cost/services/flat-referral-fee.service";
import { getCapturedFlatDepositAmount } from "modules/recruitment/interview-cost/flat-deposit.utils";
import {
  RecruitmentPayoutJobData,
  RecruitmentPayoutJobResult,
} from "modules/recruitment/payout/recruitment-payout.types";
import { RecruitmentPayoutStripeHandlerService } from "./recruitment-payout-stripe-handler.service";
import { RecruitmentPayoutCalculatorService } from "./recruitment-payout-calculator.service";

// OutboundPayment lifecycle statuses that delivered NO money to the recipient.
// If Stripe hands one of these back (e.g. via idempotency replay), the payout
// must be treated as failed — never "completed".
const TERMINAL_FAILED_OUTBOUND_STATUSES = new Set<string>([
  "failed",
  "returned",
  "canceled",
]);

@Processor(RECRUITMENT_PAYOUT_QUEUE_NAME)
export class RecruitmentPayoutQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(RecruitmentPayoutQueueProcessor.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly profilesService: ProfilesService,
    private readonly creditBalanceHelper: CreditBalanceHelper,
    private readonly calculatorService: RecruitmentPayoutCalculatorService,
    private readonly stripeHandler: RecruitmentPayoutStripeHandlerService,
    private readonly feeConfig: RecruitmentFeeConfigService,
    private readonly flatReferralFeeService: FlatReferralFeeService
  ) {
    super();
  }

  async process(
    job: Job<RecruitmentPayoutJobData>
  ): Promise<RecruitmentPayoutJobResult> {
    const { data, id } = job;
    this.logger.log(
      `Processing recruitment payout job ${id} for payout ${data.payoutId}`
    );

    try {
      return await this.processRecruitmentPayout(data);
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_PAYOUT_PROCESSOR :: process : ERROR : Job ${id}: ${error}`
      );
      await this.updateStatus(
        data.payoutId,
        RECRUITMENT_PROCESSING_STATUS.FAILED,
        String(error)
      );
      throw error;
    }
  }

  private async processRecruitmentPayout(
    data: RecruitmentPayoutJobData
  ): Promise<RecruitmentPayoutJobResult> {
    // 1. Lock payout record and check idempotency
    const [payout] = await this.db
      .select()
      .from(schema.recruitmentPayoutHistory)
      .where(eq(schema.recruitmentPayoutHistory.id, data.payoutId))
      .for("update");

    if (!payout) {
      throw new Error(`Payout record ${data.payoutId} not found`);
    }

    if (payout.stripeOutboundPaymentId) {
      this.logger.warn(`Payout ${data.payoutId} already processed, skipping`);
      return {
        success: true,
        payoutId: data.payoutId,
        recipientAmountCents: 0,
        platformAmountCents: 0,
      };
    }

    // 2. Re-verify the candidate's funding was captured before transferring out.
    //    Funding sources by payout type:
    //    - connector → the bounty (interview_cost) charge
    //    - candidate → the success_fee charge (taken at booking) AND/OR the
    //      success_fee_topup charge (taken at release when the fee was raised or
    //      enabled after booking — e.g. enabled after the candidate was hired, where
    //      there is NO success_fee, only a success_fee_topup).
    //    A fee can be raised repeatedly before release, so each type may have
    //    several rows and the AMOUNT matters, not just existence. This is the
    //    last line of defence: the release endpoint refuses to queue an
    //    under-funded payout, but money leaving the platform un-collected is the
    //    worst failure here, so it is re-checked immediately before the transfer.
    const fundingTypes =
      payout.payoutType === RECRUITMENT_PAYOUT_TYPE.CANDIDATE
        ? [
            RECRUITMENT_INTERVIEW_TXN_TYPE.SUCCESS_FEE,
            RECRUITMENT_INTERVIEW_TXN_TYPE.SUCCESS_FEE_TOPUP,
          ]
        : [
            RECRUITMENT_INTERVIEW_TXN_TYPE.INTERVIEW_COST,
            RECRUITMENT_INTERVIEW_TXN_TYPE.FLAT_TOPUP,
          ];

    const capturedRows = await this.db
      .select({
        chargeAmount: schema.recruitmentInterviewTransactions.chargeAmount,
        totalAmount: schema.recruitmentInterviewTransactions.totalAmount,
      })
      .from(schema.recruitmentInterviewTransactions)
      .where(
        and(
          eq(
            schema.recruitmentInterviewTransactions.candidateId,
            data.candidateId
          ),
          inArray(
            schema.recruitmentInterviewTransactions.transactionType,
            fundingTypes
          ),
          eq(
            schema.recruitmentInterviewTransactions.status,
            RECRUITMENT_INTERVIEW_TXN_STATUS.CAPTURED
          ),
          isNull(schema.recruitmentInterviewTransactions.deletedAt)
        )
      )
      .for("update");

    if (capturedRows.length === 0) {
      throw new Error(
        `Funding not captured for candidate ${data.candidateId} (${payout.payoutType} payout)`
      );
    }

    // Compare cash collected against what this payout is priced at. Connector
    // rows are grossed up (the recruiter pays fee + Stripe + platform fee), so
    // the gross is converted through the same calculator the charge used; the
    // candidate bonus is charged raw, so it compares directly.
    //
    // Legacy deposit: on a job that captured a `flat_deposit` under the old
    // model, the hire charge was `total(fee) - deposit`, so the cash rows alone
    // fall short of the fee by exactly that deposit. The deposit is job-scoped
    // and credited to only ONE candidate, so there is no way to attribute it
    // precisely here — it is added job-wide, which is exact for every job
    // created since (no `flat_deposit` has been written in a long time) and
    // merely lenient on legacy ones. Leniency is the right bias for a
    // last-line-of-defence check: it must never quarantine a payout that is in
    // fact funded.
    const capturedDepositCents =
      payout.payoutType === RECRUITMENT_PAYOUT_TYPE.CANDIDATE
        ? 0
        : convertToCents(
            await getCapturedFlatDepositAmount(this.db, data.jobId)
          );
    const fundedCents =
      capturedRows.reduce(
        (sum, r) =>
          sum + convertToCents(Number(r.chargeAmount ?? r.totalAmount ?? 0)),
        0
      ) + capturedDepositCents;
    const payoutGross = Number(payout.grossAmount ?? 0);
    const requiredCents =
      payout.payoutType === RECRUITMENT_PAYOUT_TYPE.CANDIDATE
        ? convertToCents(payoutGross)
        : convertToCents(
            payoutGross > 0
              ? (
                  await this.flatReferralFeeService.calculateFlatReferralFee(
                    payoutGross
                  )
                ).total
              : 0
          );

    if (fundedCents < requiredCents) {
      // Under-funded: paying out now would move money the platform never
      // collected. Retrying cannot fix it (the recruiter must pay the
      // shortfall), so quarantine rather than mark it retryably failed.
      this.logger.error(
        `RECRUITMENT_PAYOUT_PROCESSOR :: processRecruitmentPayout : ERROR : under-funded payout ${data.payoutId} — funded ${fundedCents} < required ${requiredCents}`
      );
      await this.updateStatus(
        data.payoutId,
        RECRUITMENT_PROCESSING_STATUS.MANUAL_REVIEW,
        "under_funded — manual review required"
      );
      return {
        success: false,
        payoutId: data.payoutId,
        recipientAmountCents: 0,
        platformAmountCents: 0,
        error: "under_funded",
      };
    }

    // 3. Mark as processing
    await this.updateStatus(
      data.payoutId,
      RECRUITMENT_PROCESSING_STATUS.PROCESSING
    );

    // 4. Split reconciler: if this row is part of a marketplace split and
    //    the co-recipient's account has been deleted, cancel the sibling and
    //    top THIS row up to the full 80% so the active connector is paid in
    //    full. Runs before the Stripe transfer so the full amount flows.
    let recipientBaseCents = convertToCents(payout.recipientAmount);
    let platformBaseCents = convertToCents(payout.platformAmount);

    if (payout.isMarketplaceDeal) {
      const topUp = await this.maybeAbsorbDeletedSibling(payout);
      if (topUp) {
        recipientBaseCents = topUp.recipientBaseCents;
        platformBaseCents = topUp.platformBaseCents;
      }
    }

    // 5. Check recipient Global Payouts account (recipient account + bank
    //    payout method both required before funds can flow).
    const profile = await this.profilesService.getProfileById(data.recipientId);
    if (
      !profile?.stripeRecipientAccountId ||
      !profile?.stripeRecipientOnboardingComplete
    ) {
      await this.db
        .update(schema.recruitmentPayoutHistory)
        .set({
          processingStatus: RECRUITMENT_PROCESSING_STATUS.ONBOARDING_PENDING,
          updatedAt: toUTC(),
        })
        .where(eq(schema.recruitmentPayoutHistory.id, data.payoutId));
      this.logger.warn(
        `Recipient ${data.recipientId} has no payout bank account, deferring payout`
      );
      // Payout-released email (with bank-setup CTA) is sent at HR release time.
      return {
        success: false,
        payoutId: data.payoutId,
        recipientAmountCents: 0,
        platformAmountCents: 0,
        error: "onboarding_pending",
      };
    }

    // 6. Apply credits against this row's OWN platform slice only.
    const calc = await this.calculatorService.calculate(
      data.recipientId,
      recipientBaseCents,
      platformBaseCents
    );

    // 7. Deduct Stripe payout fees from the recipient's amount (per country).
    const payoutFees = calculatePayoutFees(
      calc.effectiveRecipientCents,
      profile.country
    );
    if (payoutFees.feesExceedPayout) {
      // Structurally unpayable (Stripe payout fees ≥ the payout). Retrying will
      // always fail, so quarantine for manual review instead of 'failed'.
      await this.updateStatus(
        data.payoutId,
        RECRUITMENT_PROCESSING_STATUS.MANUAL_REVIEW,
        "fees_exceed_payout — manual review required"
      );
      return {
        success: false,
        payoutId: data.payoutId,
        recipientAmountCents: 0,
        platformAmountCents: 0,
        error: "fees_exceed_payout",
      };
    }

    // 8. Global Payouts OutboundPayment (single call)
    let stripeResult;
    try {
      stripeResult = await this.stripeHandler.executeOutboundPayment(
        payoutFees.netCents,
        profile.stripeRecipientAccountId,
        profile.stripePayoutMethodId ?? undefined,
        {
          payoutId: data.payoutId,
          candidateId: data.candidateId,
          recipientId: data.recipientId,
          creditsApplied: calc.creditApplication.creditsToApply.toString(),
        }
      );
    } catch (error) {
      // DOUBLE-PAY GUARD: on a failed transfer call we cannot always tell from
      // the error whether Stripe moved money. Only re-mark as retryable
      // ('failed') when the error PROVES no funds moved (a definitive 4xx
      // rejection). Anything ambiguous (timeout / lost response / 5xx) is
      // quarantined to 'manual_review' — never auto-retried and never
      // re-queued — because the OutboundPayment may already be in flight. The
      // authoritative Stripe webhook (outbound_payment.posted/failed) later
      // reconciles the row by metadata. In BOTH cases we return WITHOUT
      // throwing so neither BullMQ auto-retry nor the top-level catch re-sends.
      const noMoneyMoved = this.isNoMoneyMovedError(error);
      const nextStatus = noMoneyMoved
        ? RECRUITMENT_PROCESSING_STATUS.FAILED
        : RECRUITMENT_PROCESSING_STATUS.MANUAL_REVIEW;
      await this.updateStatus(
        data.payoutId,
        nextStatus,
        noMoneyMoved
          ? String(error)
          : `verification required — possible in-flight transfer: ${String(error)}`
      );
      this.logger.error(
        `RECRUITMENT_PAYOUT_PROCESSOR :: transfer : ${noMoneyMoved ? "definitive failure (retryable)" : "AMBIGUOUS failure -> manual_review"} for payout ${data.payoutId}: ${error}`
      );
      return {
        success: false,
        payoutId: data.payoutId,
        recipientAmountCents: 0,
        platformAmountCents: 0,
        error: noMoneyMoved ? "transfer_failed" : "transfer_ambiguous",
      };
    }

    // DOUBLE-PAY GUARD: Stripe's idempotency replay (a retried create with the
    // same key) returns the ORIGINAL object — which may be a terminal-failure
    // that delivered no money. Never mark such a row "completed"; treat it as a
    // retryable failure and do NOT persist its id as a successful payment.
    if (
      stripeResult.status &&
      TERMINAL_FAILED_OUTBOUND_STATUSES.has(stripeResult.status)
    ) {
      await this.updateStatus(
        data.payoutId,
        RECRUITMENT_PROCESSING_STATUS.FAILED,
        `OutboundPayment ${stripeResult.outboundPaymentId} returned terminal status=${stripeResult.status}`
      );
      this.logger.warn(
        `RECRUITMENT_PAYOUT_PROCESSOR :: transfer : OutboundPayment ${stripeResult.outboundPaymentId} status=${stripeResult.status} for payout ${data.payoutId} — marked failed, not completed`
      );
      return {
        success: false,
        payoutId: data.payoutId,
        recipientAmountCents: 0,
        platformAmountCents: 0,
        error: `transfer_${stripeResult.status}`,
      };
    }

    // 9. Post-transfer DB update (atomic with row lock)
    try {
      await this.db.transaction(async (tx) => {
        const [lockedPayout] = await tx
          .select()
          .from(schema.recruitmentPayoutHistory)
          .where(eq(schema.recruitmentPayoutHistory.id, data.payoutId))
          .for("update");

        if (lockedPayout?.stripeOutboundPaymentId) {
          return; // Already processed
        }

        await tx
          .update(schema.recruitmentPayoutHistory)
          .set({
            recipientAccountId: profile.stripeRecipientAccountId,
            stripeOutboundPaymentId: stripeResult.outboundPaymentId,
            currency: profile.payoutCurrency ?? undefined,
            recipientReceivedAmount: convertToDollars(
              payoutFees.netCents
            ).toFixed(2),
            payoutFeeBreakdown: payoutFees,
            status: RECRUITMENT_PAYOUT_STATUS.COMPLETED,
            creditsApplied: calc.creditApplication.creditsToApply.toFixed(2),
            creditsRemainingAfter: calc.creditApplication.newBalance.toFixed(2),
            commissionAfterCredits: convertToDollars(
              calc.effectivePlatformCents
            ).toFixed(2),
            processingStatus: RECRUITMENT_PROCESSING_STATUS.COMPLETED,
            processingCompletedAt: toUTC(),
            completedAt: toUTC(),
            // Clear any stale failure text from a prior failed attempt.
            errorMessage: null,
            updatedAt: toUTC(),
          })
          .where(eq(schema.recruitmentPayoutHistory.id, data.payoutId));

        // Apply credits if any
        if (calc.creditApplication.creditsToApply > 0) {
          const { balanceBefore, balanceAfter } =
            await this.creditBalanceHelper.deductCredits(
              tx,
              data.recipientId,
              calc.creditApplication.creditsToApply
            );

          await tx.insert(schema.userCreditHistory).values({
            userId: data.recipientId,
            transactionType: CREDIT_TRANSACTION_TYPES.USED,
            amount: calc.creditApplication.creditsToApply.toFixed(2),
            balanceBefore: balanceBefore.toFixed(2),
            balanceAfter: balanceAfter.toFixed(2),
            evidence: {
              recruitmentPayoutHistoryId: data.payoutId,
              candidateId: data.candidateId,
              jobId: data.jobId,
              bountyAmount: convertToDollars(data.grossAmountCents),
              originalCommission: convertToDollars(calc.platformBaseCents),
              commissionAfterCredits: convertToDollars(
                calc.effectivePlatformCents
              ),
              recipientReceived: convertToDollars(calc.effectiveRecipientCents),
              isMarketplaceDeal: payout.isMarketplaceDeal,
            },
          });
        }
      });
    } catch (error) {
      this.logger.error(
        `CRITICAL: OutboundPayment ${stripeResult.outboundPaymentId} succeeded but DB update failed for payout ${data.payoutId}: ${error}`
      );
      // The money already left via Stripe. We must NEVER auto-retry or let the
      // recruiter re-release this — a retry after Stripe's idempotency window
      // (~24h) would double-pay. Quarantine for manual review and return a
      // non-retryable result WITHOUT re-throwing, so BullMQ does not re-run the
      // job and the top-level catch does not overwrite this status with
      // 'failed'. Ops reconciles using the outbound-payment id above.
      await this.updateStatus(
        data.payoutId,
        RECRUITMENT_PROCESSING_STATUS.MANUAL_REVIEW,
        `DB update failed after outbound payment ${stripeResult.outboundPaymentId}: ${String(error).substring(0, 500)}`
      );
      return {
        success: false,
        payoutId: data.payoutId,
        recipientAmountCents: 0,
        platformAmountCents: 0,
        error: "manual_review_db_update_failed",
      };
    }

    this.logger.log(
      `Recruitment payout ${data.payoutId} completed: recipient=$${convertToDollars(calc.effectiveRecipientCents)}, platform=$${convertToDollars(calc.effectivePlatformCents)}`
    );

    return {
      success: true,
      payoutId: data.payoutId,
      stripeOutboundPaymentId: stripeResult.outboundPaymentId,
      recipientAmountCents: calc.effectiveRecipientCents,
      platformAmountCents: calc.effectivePlatformCents,
    };
  }

  // For split payouts only: if the SIBLING row's recipient user has been
  // deleted, cancel that sibling row and absorb its share into this row so
  // the active connector is paid the full 80% instead of 40%.
  //
  // Returns the new (recipientBaseCents, platformBaseCents) pair for THIS
  // row if a top-up was applied, or null if nothing changed.
  private async maybeAbsorbDeletedSibling(
    payout: typeof schema.recruitmentPayoutHistory.$inferSelect
  ): Promise<{ recipientBaseCents: number; platformBaseCents: number } | null> {
    // Find sibling row on the same (candidateId, jobId) that is not THIS row,
    // not already cancelled, and belongs to a user that has been soft-deleted.
    const [sibling] = await this.db
      .select({
        payoutId: schema.recruitmentPayoutHistory.id,
        recipientId: schema.recruitmentPayoutHistory.recipientId,
        status: schema.recruitmentPayoutHistory.status,
        siblingUserDeletedAt: schema.users.deletedAt,
      })
      .from(schema.recruitmentPayoutHistory)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.recruitmentPayoutHistory.recipientId)
      )
      .where(
        and(
          eq(schema.recruitmentPayoutHistory.candidateId, payout.candidateId),
          eq(schema.recruitmentPayoutHistory.jobId, payout.jobId),
          ne(schema.recruitmentPayoutHistory.id, payout.id),
          ne(
            schema.recruitmentPayoutHistory.status,
            RECRUITMENT_PAYOUT_STATUS.CANCELLED
          ),
          isNull(schema.recruitmentPayoutHistory.deletedAt)
        )
      )
      .limit(1);

    if (!sibling || !sibling.siblingUserDeletedAt) {
      return null;
    }

    // Sibling's user is deleted — cancel the sibling row and top THIS row
    // from sharePercent of the connector pool → 100% of the connector pool
    // (i.e. the full CONNECTOR_PERCENT of gross). Platform slice grows
    // correspondingly.
    const grossCents = convertToCents(payout.grossAmount);
    const newRecipientBaseCents = Math.floor(
      (grossCents * this.feeConfig.getConnectorPercent()) / 100
    );
    const newPlatformBaseCents = grossCents - newRecipientBaseCents;

    await this.db.transaction(async (tx) => {
      // Cancel sibling (idempotent — double-check it's still not cancelled
      // and not yet completed under row lock).
      await tx
        .update(schema.recruitmentPayoutHistory)
        .set({
          status: RECRUITMENT_PAYOUT_STATUS.CANCELLED,
          errorMessage: "sharer_deleted",
          updatedAt: toUTC(),
        })
        .where(
          and(
            eq(schema.recruitmentPayoutHistory.id, sibling.payoutId),
            not(
              eq(
                schema.recruitmentPayoutHistory.status,
                RECRUITMENT_PAYOUT_STATUS.COMPLETED
              )
            )
          )
        );

      // Top up THIS row. We keep isMarketplaceDeal=true as a historical
      // marker — the row was created as a split and we don't rewrite that.
      await tx
        .update(schema.recruitmentPayoutHistory)
        .set({
          recipientAmount: convertToDollars(newRecipientBaseCents).toFixed(2),
          platformAmount: convertToDollars(newPlatformBaseCents).toFixed(2),
          updatedAt: toUTC(),
        })
        .where(eq(schema.recruitmentPayoutHistory.id, payout.id));
    });

    this.logger.log(
      `Payout ${payout.id} absorbed deleted sibling ${sibling.payoutId};`
    );

    return {
      recipientBaseCents: newRecipientBaseCents,
      platformBaseCents: newPlatformBaseCents,
    };
  }

  /**
   * DOUBLE-PAY GUARD classifier. Returns true ONLY when a thrown transfer error
   * proves Stripe did NOT move money — a definitive client-side rejection (4xx:
   * invalid request, insufficient balance, recipient rejected, rate-limited).
   * Returns false (ambiguous → fail-safe quarantine) for connection/timeout
   * errors, Stripe-side (5xx) errors, or any non-Stripe/unknown error, since the
   * OutboundPayment may have been created before the response reached us.
   */
  private isNoMoneyMovedError(error: unknown): boolean {
    if (!(error instanceof Stripe.errors.StripeError)) {
      return false;
    }
    // Network/connection issues and generic Stripe API (5xx) errors are
    // AMBIGUOUS — the request may have reached Stripe and created the payment.
    if (
      error instanceof Stripe.errors.StripeConnectionError ||
      error instanceof Stripe.errors.StripeAPIError
    ) {
      return false;
    }
    const statusCode = error.statusCode ?? 0;
    return statusCode >= 400 && statusCode < 500;
  }

  private async updateStatus(
    payoutId: string,
    status: string,
    errorMessage?: string
  ) {
    const truncatedError = errorMessage?.substring(0, 1000);
    await this.db
      .update(schema.recruitmentPayoutHistory)
      .set({
        processingStatus: status,
        ...(truncatedError ? { errorMessage: truncatedError } : {}),
        ...(status === RECRUITMENT_PROCESSING_STATUS.PROCESSING
          ? { processingStartedAt: toUTC() }
          : {}),
        updatedAt: toUTC(),
      })
      .where(eq(schema.recruitmentPayoutHistory.id, payoutId));
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(`Recruitment payout job ${job.id} completed`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Recruitment payout job ${job.id} failed: ${error.message}`
    );
  }
}
