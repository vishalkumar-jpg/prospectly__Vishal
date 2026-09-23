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
import { eq, and, isNull } from "drizzle-orm";
import { RecruitmentFlatTopupService } from "./recruitment-flat-topup.service";
import { RecruitmentSuccessFeeTopupService } from "./recruitment-success-fee-topup.service";
import { RecruitmentPayoutStateService } from "./recruitment-payout-state.service";
import {
  RECRUITMENT_PAYOUT_TYPE,
  RECRUITMENT_CONNECTOR_CLASSIFICATION,
} from "../recruitment-payout.constants";
import { FundPayoutTopUpDto } from "../recruitment-payout.dto";
import {
  FundPayoutTopUpResponse,
  PayoutRowState,
} from "../recruitment-payout.response";

// Display statuses a recruiter can still act on — mirrors the release service's
// "actionable" filter (lifecycle status='pending' with processingStatus
// null/'pending', or a recoverable 'failed' the recruiter can retry). A row that
// has been handed to the worker, deferred, quarantined or settled is frozen.
const ACTIONABLE_STATUSES: ReadonlySet<PayoutRowState["status"]> = new Set([
  "pending",
  "failed",
]);

// Step 1 of the two-step release: collect the post-hire fee top-up and NOTHING
// else. No payout is queued here — that is step 2 (`RecruitmentPayoutReleaseService`).
//
// Why this exists: releasing used to charge the recruiter's card and queue the
// payout in one request, so a declined card surfaced as a failed *payout*. Split
// in two, the recruiter pays first and sees a payment failure as a payment
// failure; only once the money is collected do they release.
//
// This service deliberately does NOT duplicate the release service's disposition
// logic (classification persistence, inactive-internal cancellation, queueing).
// It reads eligibility from RecruitmentPayoutStateService — the same read the
// dialog uses — so its gate can never disagree with the write endpoint, and it
// charges through the same idempotent top-up services release calls. Releasing
// afterwards is therefore a no-op on the charge and cannot double-charge.
@Injectable()
export class RecruitmentPayoutFundService {
  private readonly logger = new Logger(RecruitmentPayoutFundService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly stateService: RecruitmentPayoutStateService,
    private readonly flatTopupService: RecruitmentFlatTopupService,
    private readonly successFeeTopupService: RecruitmentSuccessFeeTopupService
  ) {}

  async fundTopUp(
    userId: string,
    candidateId: string,
    dto: FundPayoutTopUpDto
  ): Promise<FundPayoutTopUpResponse> {
    const candidate = await this.loadHiredCandidate(candidateId);
    const state = await this.stateService.getState(userId, candidateId);

    // State resolves WHO is being funded and whether they're eligible; the amount
    // is recomputed here from the price row and what has already been collected.
    // No figure is ever accepted from the client.
    const target =
      dto.scope === RECRUITMENT_PAYOUT_TYPE.CONNECTOR
        ? this.resolveConnectorTarget(state)
        : this.resolveCandidateTarget(state);

    if (dto.scope === RECRUITMENT_PAYOUT_TYPE.CONNECTOR) {
      const topUp = await this.flatTopupService.computeTopUp(this.db, {
        jobId: candidate.jobId,
        candidateId,
        oldBaseFee: await this.getHireFeeSnapshot(
          candidateId,
          target.recipientId
        ),
      });

      // Nothing owed (fee unchanged/lowered, or already fully funded). Not an
      // error — the client skips the Pay step; this is the race guard for a
      // double click or a stale dialog.
      if (!topUp || topUp.topUp <= 0) {
        return this.buildResponse(candidateId, dto.scope, false);
      }

      await this.flatTopupService.chargeTopUpIfNeeded({
        candidateId,
        jobId: candidate.jobId,
        recruiterId: candidate.requesterId,
        connectorUserId: target.recipientId,
        topUp: topUp.topUp,
        targetTotal: topUp.newTotal,
      });
    } else {
      const topUp = await this.successFeeTopupService.computeSuccessFeeTopUp(
        this.db,
        { jobId: candidate.jobId, candidateId }
      );

      if (!topUp || topUp.topUp <= 0) {
        return this.buildResponse(candidateId, dto.scope, false);
      }

      await this.successFeeTopupService.chargeSuccessFeeTopUpIfNeeded({
        candidateId,
        jobId: candidate.jobId,
        recruiterId: candidate.requesterId,
        topUp: topUp.topUp,
        targetTotal: topUp.latest,
      });
    }

    this.logger.log(
      `RECRUITMENT_PAYOUT_FUND :: fundTopUp : collected ${dto.scope} top-up for candidate ${candidateId}`
    );

    return this.buildResponse(candidateId, dto.scope, true);
  }

  /**
   * The base fee this candidate's connector payout was snapshotted at when they
   * were hired. `computeTopUp` nets every top-up already collected off it, so a
   * repeat raise charges only its own delta. Read here rather than exposed on the
   * payout-state response — it is an internal figure, not something the dialog
   * needs.
   */
  private async getHireFeeSnapshot(
    candidateId: string,
    recipientId: string | null
  ): Promise<number> {
    if (!recipientId) return 0;
    const [row] = await this.db
      .select({ grossAmount: schema.recruitmentPayoutHistory.grossAmount })
      .from(schema.recruitmentPayoutHistory)
      .where(
        and(
          eq(schema.recruitmentPayoutHistory.candidateId, candidateId),
          eq(schema.recruitmentPayoutHistory.recipientId, recipientId),
          isNull(schema.recruitmentPayoutHistory.deletedAt)
        )
      )
      .limit(1);
    return Number(row?.grossAmount ?? 0);
  }

  private async loadHiredCandidate(candidateId: string) {
    const [candidate] = await this.db
      .select({
        id: schema.recruitmentJobCandidates.id,
        stageId: schema.recruitmentJobCandidates.stageId,
        jobId: schema.recruitmentJobCandidates.jobId,
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

    return candidate;
  }

  // The connector whose payout this charge funds. Money is only collected for a
  // payout that can actually go out in the same sitting, so an un-elapsed waiting
  // period blocks the charge rather than pre-funding it.
  private resolveConnectorTarget(
    state: Awaited<ReturnType<RecruitmentPayoutStateService["getState"]>>
  ): { recipientId: string } {
    const actionable = state.connectors.filter(
      (c) => c.payout && ACTIONABLE_STATUSES.has(c.payout.status)
    );

    if (actionable.length === 0) {
      throw new ConflictException(
        "No releasable connector payouts found for this candidate"
      );
    }

    // A connector classified internal + no longer an active employee is cancelled
    // at release (reason `inactive_employee`) and never paid — so never collect
    // money for it.
    const payable = actionable.filter(
      (c) =>
        !(
          c.classificationType ===
            RECRUITMENT_CONNECTOR_CLASSIFICATION.INTERNAL &&
          c.isActiveEmployee === false
        )
    );

    if (payable.length === 0) {
      throw new BadRequestException(
        "This connector is marked as no longer an active employee, so no payout will be sent and there is nothing to pay."
      );
    }

    // Unclassified rows are gated by `canReleaseNow`, but for a different reason
    // than the waiting period — say which so the message is actionable.
    if (payable.every((c) => !c.classificationType)) {
      throw new BadRequestException(
        "Confirm the connector's classification before making this payment."
      );
    }

    const releasable = payable.filter((c) => c.payout?.canReleaseNow === true);

    if (releasable.length === 0) {
      throw new BadRequestException(
        "This payout isn't available to release yet, so there's nothing to pay right now. You can pay when the waiting period ends."
      );
    }

    // Single-connector scope: every actionable connector row shares the same
    // hire-time fee snapshot, so they share one top-up (one row per candidate).
    // Repeated/staged top-ups for split referrals are deferred.
    const [target] = releasable;
    return { recipientId: target.connectorUserId };
  }

  private resolveCandidateTarget(
    state: Awaited<ReturnType<RecruitmentPayoutStateService["getState"]>>
  ): { recipientId: string | null } {
    const row = state.candidatePayout;

    if (!row || !ACTIONABLE_STATUSES.has(row.status)) {
      throw new ConflictException(
        "No releasable candidate payouts found for this candidate"
      );
    }

    if (!row.canReleaseNow) {
      throw new BadRequestException(
        "This bonus isn't available to release yet, so there's nothing to pay right now. You can pay when the probation period ends."
      );
    }

    return { recipientId: null };
  }

  // Re-read the funded row so the response reports what was actually recorded
  // (including on an idempotent replay, where this request charged nothing but a
  // previous one did).
  private async buildResponse(
    candidateId: string,
    scope: "connector" | "candidate",
    charged: boolean
  ): Promise<FundPayoutTopUpResponse> {
    const funded =
      scope === RECRUITMENT_PAYOUT_TYPE.CONNECTOR
        ? await this.flatTopupService.getFundedTopUpSummary(
            this.db,
            candidateId
          )
        : await this.successFeeTopupService.getFundedTopUpSummary(
            this.db,
            candidateId
          );

    return {
      candidateId,
      scope,
      charged,
      amount: funded ? funded.amount.toFixed(2) : null,
      paidAt: funded?.paidAt?.toISOString() ?? null,
    };
  }
}
