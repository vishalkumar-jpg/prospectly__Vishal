import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { convertToCents } from "modules/payments/utils/payment-calculations.util";
import {
  computeProbation,
  computeConnectorWaitWindow,
  canReleaseConnectorNow,
  canReleaseCandidateNow,
} from "./recruitment-payout-gating.helper";
import { RecruitmentFlatTopupService } from "./recruitment-flat-topup.service";
import { RecruitmentSuccessFeeTopupService } from "./recruitment-success-fee-topup.service";
import { RecruitmentPayoutQueueService } from "../../payout-queue/recruitment-payout-queue.service";
import { RecruitmentLifecycleNotificationDispatchService } from "../../notifications/services/recruitment-lifecycle-notification-dispatch.service";
import { RecruitmentFeeConfigService } from "../../fee-config/recruitment-fee-config.service";
import {
  RECRUITMENT_PAYOUT_TYPE,
  RECRUITMENT_PAYOUT_STATUS,
  RECRUITMENT_PROCESSING_STATUS,
  RECRUITMENT_PAYOUT_CANCELLATION_REASON,
  RECRUITMENT_CONNECTOR_CLASSIFICATION,
  RECRUITER_SELECTABLE_CANCELLATION_REASONS,
  RECRUITER_SELECTABLE_CONNECTOR_CANCELLATION_REASONS,
  SINGLE_CONNECTOR_SHARE_PERCENT,
} from "../recruitment-payout.constants";
import { ReleasePayoutDto } from "../recruitment-payout.dto";

// Recruiter-selectable cancellation reasons per scope. The candidate bonus and
// connector payouts use different reason sets (the connector reasons aren't
// candidate-centric).
const SELECTABLE_REASONS_BY_SCOPE: Record<string, ReadonlySet<string>> = {
  [RECRUITMENT_PAYOUT_TYPE.CANDIDATE]: new Set(
    RECRUITER_SELECTABLE_CANCELLATION_REASONS
  ),
  [RECRUITMENT_PAYOUT_TYPE.CONNECTOR]: new Set(
    RECRUITER_SELECTABLE_CONNECTOR_CANCELLATION_REASONS
  ),
};

// Manual release of payouts on the Hired stage, scoped to one payout type
// (`scope` = 'connector' | 'candidate'). Connector payouts and the candidate
// success-fee bonus are released/cancelled independently.
//
// retained=false:
//   Cancels the scoped pending rows with the recruiter-supplied reason + notes
//   (reason must belong to the scope's set). No money moves.
//
// retained=true:
//   Per-row independent release of the scoped rows. CONNECTOR scope: re-confirm
//   classification, then queue a Stripe transfer, cancel internal+inactive with
//   reason='inactive_employee', or — if the per-type waiting period (hire_date +
//   int/extConnectorPayoutWaitDays) hasn't elapsed — leave it pending. CANDIDATE scope:
//   queue the bonus once probation (hire_date + probationPeriodDays) has elapsed,
//   else leave pending. Rows still inside their window are NOT an error: the
//   release queues whatever is eligible and reports the rest via `stillPending`.
@Injectable()
export class RecruitmentPayoutReleaseService {
  private readonly logger = new Logger(RecruitmentPayoutReleaseService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly payoutQueueService: RecruitmentPayoutQueueService,
    private readonly lifecycleDispatch: RecruitmentLifecycleNotificationDispatchService,
    private readonly feeConfig: RecruitmentFeeConfigService,
    private readonly flatTopupService: RecruitmentFlatTopupService,
    private readonly successFeeTopupService: RecruitmentSuccessFeeTopupService
  ) {}

  async releasePayouts(
    userId: string,
    candidateId: string,
    dto: ReleasePayoutDto
  ) {
    const now = toUTC();

    const [candidate] = await this.db
      .select({
        id: schema.recruitmentJobCandidates.id,
        stageId: schema.recruitmentJobCandidates.stageId,
        jobId: schema.recruitmentJobCandidates.jobId,
        hireDate: schema.recruitmentJobCandidates.hireDate,
        requesterId: schema.recruitmentJobsSchema.requesterId,
        probationPeriodDays: schema.recruitmentJobsSchema.probationPeriodDays,
        intPayoutWaits: schema.recruitmentJobPricesSchema.intPayoutWaits,
        extPayoutWaits: schema.recruitmentJobPricesSchema.extPayoutWaits,
        intConnectorPayoutWaitDays:
          schema.recruitmentJobPricesSchema.intConnectorPayoutWaitDays,
        extConnectorPayoutWaitDays:
          schema.recruitmentJobPricesSchema.extConnectorPayoutWaitDays,
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
        schema.recruitmentJobPricesSchema,
        eq(
          schema.recruitmentJobCandidates.jobId,
          schema.recruitmentJobPricesSchema.jobId
        )
      )
      .where(
        and(
          eq(schema.recruitmentJobCandidates.id, candidateId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);

    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }

    const [hiredStage] = await this.db
      .select({ id: schema.recruitmentStagesSchema.id })
      .from(schema.recruitmentStagesSchema)
      .where(eq(schema.recruitmentStagesSchema.stageKey, "hired"))
      .limit(1);

    if (!hiredStage || candidate.stageId !== hiredStage.id) {
      throw new BadRequestException(
        "Candidate must be in hired stage to release payouts"
      );
    }

    const payouts = await this.db
      .select({
        id: schema.recruitmentPayoutHistory.id,
        recipientId: schema.recruitmentPayoutHistory.recipientId,
        payoutType: schema.recruitmentPayoutHistory.payoutType,
        status: schema.recruitmentPayoutHistory.status,
        processingStatus: schema.recruitmentPayoutHistory.processingStatus,
        grossAmount: schema.recruitmentPayoutHistory.grossAmount,
        jobId: schema.recruitmentPayoutHistory.jobId,
      })
      .from(schema.recruitmentPayoutHistory)
      .where(
        and(
          eq(schema.recruitmentPayoutHistory.candidateId, candidateId),
          isNull(schema.recruitmentPayoutHistory.deletedAt)
        )
      );

    // "Actionable" = recruiter still has a decision to make. A row is actionable
    // when it is either never-released (processingStatus null/'pending') OR a
    // recoverable failure the recruiter can retry (processingStatus 'failed').
    // Rows handed off to the worker (queued / processing), deferred
    // (onboarding_pending), terminal (completed / cancelled), or quarantined
    // (manual_review — e.g. fees_exceed_payout or money-already-sent) are NOT
    // actionable here and stay hidden/read-only in the dialog — see
    // RecruitmentPayoutStateService.deriveDisplayStatus and ReleasePayoutDialog.
    // Only act on rows matching the requested scope (connector vs candidate).
    const pending = payouts.filter(
      (p) =>
        p.payoutType === dto.scope &&
        p.status === RECRUITMENT_PAYOUT_STATUS.PENDING &&
        (p.processingStatus === null ||
          p.processingStatus === RECRUITMENT_PROCESSING_STATUS.PENDING ||
          p.processingStatus === RECRUITMENT_PROCESSING_STATUS.FAILED)
    );
    if (pending.length === 0) {
      throw new ConflictException(
        `No releasable ${dto.scope} payouts found for this candidate`
      );
    }

    const selectableReasons =
      SELECTABLE_REASONS_BY_SCOPE[dto.scope] ??
      SELECTABLE_REASONS_BY_SCOPE[RECRUITMENT_PAYOUT_TYPE.CANDIDATE];

    // ---- retained = false: cancel everything still actionable ----
    // Mirror the same processingStatus narrowing as the `pending` array so
    // we don't accidentally cancel a row whose Stripe transfer is already
    // in flight (queued / processing / onboarding_pending). The full set of
    // pending IDs has been computed above; using inArray on those IDs keeps
    // the WHERE simple and exact.
    if (!dto.retained) {
      // DTO already enforces presence + allowed-value-set, but we re-check
      // here so a service-level caller (e.g. tests) can't sneak in a
      // reserved system reason.
      if (
        !dto.cancellationReason ||
        !selectableReasons.has(dto.cancellationReason)
      ) {
        throw new BadRequestException(
          `A valid ${dto.scope} cancellation reason is required`
        );
      }
      const trimmedNotes = dto.cancellationNotes?.trim();
      if (!trimmedNotes || trimmedNotes.length < 3) {
        throw new BadRequestException("Cancellation notes are required");
      }

      await this.db
        .update(schema.recruitmentPayoutHistory)
        .set({
          status: RECRUITMENT_PAYOUT_STATUS.CANCELLED,
          cancellationReason: dto.cancellationReason,
          cancellationNotes: trimmedNotes,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(
          and(
            inArray(
              schema.recruitmentPayoutHistory.id,
              pending.map((p) => p.id)
            ),
            isNull(schema.recruitmentPayoutHistory.deletedAt)
          )
        );
      return {
        candidateId,
        scope: dto.scope,
        retained: false,
        cancelled: pending.length,
        queued: 0,
      };
    }

    // ---- retained = true: classify + queue (or cancel inactive) ----
    const classMap = new Map(
      (dto.classifications ?? []).map((c) => [c.connectorUserId, c])
    );

    // Window checks. The candidate success-fee row is gated by probation
    // (hire_date + probationPeriodDays); connector rows are gated by a per-type
    // waiting period (hire_date + int/extConnectorPayoutWaitDays) selected by the
    // row's classification, computed per row below. A future end date blocks the
    // release for any row that requires that window.
    const { probationElapsed } = computeProbation({
      hireDate: candidate.hireDate,
      probationPeriodDays: candidate.probationPeriodDays,
    });
    const waitContext = {
      hireDate: candidate.hireDate,
      intConnectorPayoutWaitDays: candidate.intConnectorPayoutWaitDays,
      extConnectorPayoutWaitDays: candidate.extConnectorPayoutWaitDays,
    };
    const timingFlags = {
      intPayoutWaits: candidate.intPayoutWaits === true,
      extPayoutWaits: candidate.extPayoutWaits === true,
    };

    // Per-row independent release: each row is released as soon as its own
    // window has elapsed. Rows still inside their window are left pending (not
    // an error) so the recruiter can come back for them later — e.g. release
    // an instant connector now while a 5-day-wait connector stays pending.
    const queueable: typeof pending = [];
    const cancelInactive: string[] = [];
    let stillPending = 0;

    // --- Tx1: disposition — classify, cancel inactive, collect queueable ---
    // Queued-marking is deferred to Tx2 so the post-hire top-up (a Stripe charge
    // that must run OUTSIDE any DB transaction) can happen between the two: only
    // AFTER we know which rows are about to be paid, and only marked queued once
    // the top-up has been collected. Persisting classification here is harmless
    // if we later abort — it is idempotent metadata.
    await this.db.transaction(async (tx) => {
      for (const row of pending) {
        if (row.payoutType === RECRUITMENT_PAYOUT_TYPE.CANDIDATE) {
          // Candidate success-fee row — gated by probation.
          if (canReleaseCandidateNow(probationElapsed)) {
            queueable.push(row);
          } else {
            stillPending++;
          }
          continue;
        }

        // Connector row — apply re-confirmed classification. If none was sent
        // for this connector this round, leave it pending.
        const cls = classMap.get(row.recipientId);
        if (!cls) {
          stillPending++;
          continue;
        }

        // Persist (possibly updated) classification
        await tx
          .update(schema.recruitmentCandidateConnectors)
          .set({
            classificationType: cls.classificationType,
            isActiveEmployee:
              cls.classificationType ===
              RECRUITMENT_CONNECTOR_CLASSIFICATION.INTERNAL
                ? (cls.isActiveEmployee ?? null)
                : null,
          })
          .where(
            and(
              eq(
                schema.recruitmentCandidateConnectors.candidateId,
                candidateId
              ),
              eq(
                schema.recruitmentCandidateConnectors.connectorUserId,
                row.recipientId
              ),
              isNull(schema.recruitmentCandidateConnectors.deletedAt)
            )
          );

        // Inactive internal -> cancel
        if (
          cls.classificationType ===
            RECRUITMENT_CONNECTOR_CLASSIFICATION.INTERNAL &&
          cls.isActiveEmployee === false
        ) {
          await tx
            .update(schema.recruitmentPayoutHistory)
            .set({
              status: RECRUITMENT_PAYOUT_STATUS.CANCELLED,
              cancellationReason:
                RECRUITMENT_PAYOUT_CANCELLATION_REASON.INACTIVE_EMPLOYEE,
              updatedAt: now,
              updatedBy: userId,
            })
            .where(eq(schema.recruitmentPayoutHistory.id, row.id));
          cancelInactive.push(row.id);
          continue;
        }

        // Waiting-period gate (shared helper — same logic as the read endpoint).
        // The window is per connector type, so compute it from this row's
        // classification. Not elapsed yet -> leave pending, don't block the rest.
        const { connectorWaitElapsed } = computeConnectorWaitWindow(
          { classificationType: cls.classificationType },
          waitContext
        );
        if (
          canReleaseConnectorNow(
            { classificationType: cls.classificationType },
            timingFlags,
            connectorWaitElapsed
          )
        ) {
          queueable.push(row);
        } else {
          stillPending++;
        }
      }
    });

    // --- Post-hire fee re-sync (connector scope only) ---
    // If HR edited the Flat Referral Fee after this candidate was hired, pay the
    // connector at the LATEST fee. `resyncGross` (null when there is nothing to
    // reconcile) is the fee we re-price the queueable connector rows to in Tx2.
    //
    // Release does NOT charge. Collecting a raised fee is the Pay step's job
    // (`POST /payout/:candidateId/fund`); here we only assert the money is
    // already in. Releasing under-funded would pay the connector at a fee the
    // platform never collected, which is exactly what used to happen silently
    // when a fee was raised twice before release.
    let resyncGross: number | null = null;
    const connectorQueueable = queueable.filter(
      (r) => r.payoutType === RECRUITMENT_PAYOUT_TYPE.CONNECTOR
    );
    if (
      dto.scope === RECRUITMENT_PAYOUT_TYPE.CONNECTOR &&
      connectorQueueable.length > 0
    ) {
      // Every queueable connector row shares the same hire-time snapshot, so any
      // row's grossAmount is the fee this candidate was charged at.
      const oldBaseFee = Number(connectorQueueable[0].grossAmount ?? "0");
      const topUp = await this.flatTopupService.computeTopUp(this.db, {
        jobId: candidate.jobId,
        candidateId,
        oldBaseFee,
      });
      if (topUp) {
        if (topUp.topUp > 0) {
          // responseUtils.error forwards only { statusCode, message }, so the
          // amount goes in the message. The dialog refetches on failure and
          // re-reads the owed figure from state rather than parsing this.
          throw new ConflictException(
            `The referral fee changed. $${topUp.topUp.toFixed(2)} more is due before this payout can be released.`
          );
        }
        resyncGross = topUp.currentFee;
      }
    }

    // --- Latest Success Fee re-sync (candidate scope only) ---
    // Pay the candidate the LATEST Success Fee, but only once it is fully funded.
    // Same rule as the connector scope: the Pay step collects, release asserts.
    // If the fee was lowered, pay the lower current amount (no refund).
    let candidateResyncGross: number | null = null;
    const candidateQueueable = queueable.filter(
      (r) => r.payoutType === RECRUITMENT_PAYOUT_TYPE.CANDIDATE
    );
    if (
      dto.scope === RECRUITMENT_PAYOUT_TYPE.CANDIDATE &&
      candidateQueueable.length > 0
    ) {
      const topUp = await this.successFeeTopupService.computeSuccessFeeTopUp(
        this.db,
        { jobId: candidate.jobId, candidateId }
      );
      if (topUp) {
        if (topUp.topUp > 0) {
          throw new ConflictException(
            `The success fee changed. $${topUp.topUp.toFixed(2)} more is due before this bonus can be released.`
          );
        }
        // Never pay more than was collected. With the guard above these are
        // equal; the clamp stays as a belt-and-braces against a lowered fee.
        candidateResyncGross = Math.min(topUp.latest, topUp.funded);
      }
    }

    // Effective gross used for the Stripe transfer per row (re-synced fee once
    // reconciled per scope; the untouched snapshot otherwise).
    const effectiveGross = (row: (typeof queueable)[number]): number => {
      if (
        row.payoutType === RECRUITMENT_PAYOUT_TYPE.CONNECTOR &&
        resyncGross !== null
      ) {
        return resyncGross;
      }
      if (
        row.payoutType === RECRUITMENT_PAYOUT_TYPE.CANDIDATE &&
        candidateResyncGross !== null
      ) {
        return candidateResyncGross;
      }
      return Number(row.grossAmount ?? "0");
    };

    // --- Tx2: re-sync connector amounts to the latest fee + mark queued ---
    await this.db.transaction(async (tx) => {
      for (const row of queueable) {
        if (
          row.payoutType === RECRUITMENT_PAYOUT_TYPE.CONNECTOR &&
          resyncGross !== null
        ) {
          // Re-price to the latest fee (up OR down) so the connector is paid the
          // current fee; the breakdown mirrors payout-create so read/write stay
          // in lockstep.
          const { recipientAmount, platformAmount } =
            this.feeConfig.getConnectorPayoutBreakdown(
              resyncGross,
              SINGLE_CONNECTOR_SHARE_PERCENT
            );
          await tx
            .update(schema.recruitmentPayoutHistory)
            .set({
              processingStatus: RECRUITMENT_PROCESSING_STATUS.QUEUED,
              grossAmount: resyncGross.toFixed(2),
              recipientAmount,
              platformAmount,
              // Clear stale failure text when re-queuing a retried row.
              errorMessage: null,
              updatedAt: now,
              updatedBy: userId,
            })
            .where(eq(schema.recruitmentPayoutHistory.id, row.id));
        } else if (
          row.payoutType === RECRUITMENT_PAYOUT_TYPE.CANDIDATE &&
          candidateResyncGross !== null
        ) {
          // Re-price the bonus to the latest Success Fee (100% to the candidate).
          await tx
            .update(schema.recruitmentPayoutHistory)
            .set({
              processingStatus: RECRUITMENT_PROCESSING_STATUS.QUEUED,
              grossAmount: candidateResyncGross.toFixed(2),
              recipientAmount: this.feeConfig.splitAmount(
                candidateResyncGross,
                this.feeConfig.getCandidateSuccessFeeRecipientPercent()
              ),
              platformAmount: this.feeConfig.splitAmount(
                candidateResyncGross,
                this.feeConfig.getCandidateSuccessFeePlatformPercent()
              ),
              // Clear stale failure text when re-queuing a retried row.
              errorMessage: null,
              updatedAt: now,
              updatedBy: userId,
            })
            .where(eq(schema.recruitmentPayoutHistory.id, row.id));
        } else {
          await tx
            .update(schema.recruitmentPayoutHistory)
            .set({
              processingStatus: RECRUITMENT_PROCESSING_STATUS.QUEUED,
              // Clear stale failure text when re-queuing a retried row.
              errorMessage: null,
              updatedAt: now,
              updatedBy: userId,
            })
            .where(eq(schema.recruitmentPayoutHistory.id, row.id));
        }
      }
    });

    // Outside tx: enqueue BullMQ jobs
    for (const row of queueable) {
      try {
        const job = await this.payoutQueueService.queuePayoutJob(
          {
            payoutId: row.id,
            candidateId,
            jobId: row.jobId,
            recipientId: row.recipientId,
            payoutType: row.payoutType,
            grossAmountCents: convertToCents(effectiveGross(row)),
            triggeredAt: now.toISOString(),
          },
          0
        );
        await this.db
          .update(schema.recruitmentPayoutHistory)
          .set({ queueJobId: job.id, updatedAt: toUTC() })
          .where(eq(schema.recruitmentPayoutHistory.id, row.id));

        void this.lifecycleDispatch
          .dispatchPayoutReleased(
            row.id,
            row.recipientId,
            now.toISOString(),
            userId
          )
          .catch((err: unknown) => {
            this.logger.error(
              `RECRUITMENT_PAYOUT_RELEASE :: payout_released_email : ERROR : payout=${row.id} :: ${err}`
            );
          });
      } catch (error) {
        this.logger.error(
          `RECRUITMENT_PAYOUT_RELEASE :: queuePayout : ERROR : Failed to queue ${row.id}: ${error}`
        );
      }
    }

    return {
      candidateId,
      scope: dto.scope,
      retained: true,
      queued: queueable.length,
      cancelledInactive: cancelInactive.length,
      stillPending,
    };
  }
}
