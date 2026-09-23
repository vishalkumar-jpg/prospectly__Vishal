import { Injectable, Inject, NotFoundException, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import { MediaService } from "modules/media/media.service";
import {
  computeProbation,
  computeConnectorWaitWindow,
  canReleaseConnectorNow,
  canReleaseCandidateNow,
} from "./recruitment-payout-gating.helper";
import { RecruitmentSuccessFeeTopupService } from "./recruitment-success-fee-topup.service";
import { RecruitmentFlatTopupService } from "./recruitment-flat-topup.service";
import { FlatReferralFeeService } from "../../interview-cost/services/flat-referral-fee.service";
import { RecruitmentFeeConfigService } from "../../fee-config/recruitment-fee-config.service";
import {
  RECRUITMENT_PAYOUT_TYPE,
  RECRUITMENT_PROCESSING_STATUS,
  SINGLE_CONNECTOR_SHARE_PERCENT,
  toSafeFailureReason,
} from "../recruitment-payout.constants";
import {
  CandidatePayoutStateResponse,
  PayoutRowState,
  PayoutStateConnector,
  PayoutTopUpFunded,
  RecruitmentPayoutCancellationReason,
  RecruitmentPayoutRowStatus,
} from "../recruitment-payout.response";
import { isConnectorClassificationStage } from "../../candidate-connectors/candidate-connectors.constants";

// A row the recruiter can still act on: never released (processingStatus
// null/'pending') or a recoverable failure they can retry. Matches the release
// service's actionable filter — only these rows get re-priced to the latest fee.
function isActionablePayoutRow(
  status: string,
  processingStatus: string | null
): boolean {
  return (
    status === "pending" &&
    (processingStatus === null ||
      processingStatus === RECRUITMENT_PROCESSING_STATUS.PENDING ||
      processingStatus === RECRUITMENT_PROCESSING_STATUS.FAILED)
  );
}

// Read-only endpoint feeding the Release Payout + Edit Classification dialogs.
// Returns the per-connector + candidate-row payout state, plus probation
// eligibility per row, so the UI can decide whether to render a form (pending)
// or a status pill (anything else) and whether to enable / disable Release.
//
// Shares its gating logic with RecruitmentPayoutReleaseService via the
// recruitment-payout-gating.helper so the dialog never reports
// `canReleaseNow=true` for a row the write endpoint would reject.
@Injectable()
export class RecruitmentPayoutStateService {
  private readonly logger = new Logger(RecruitmentPayoutStateService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly mediaService: MediaService,
    private readonly flatReferralFeeService: FlatReferralFeeService,
    private readonly successFeeTopupService: RecruitmentSuccessFeeTopupService,
    private readonly flatTopupService: RecruitmentFlatTopupService,
    private readonly feeConfig: RecruitmentFeeConfigService
  ) {}

  async getState(
    userId: string,
    candidateId: string
  ): Promise<CandidatePayoutStateResponse> {
    const [candidate] = await this.db
      .select({
        id: schema.recruitmentJobCandidates.id,
        jobId: schema.recruitmentJobCandidates.jobId,
        candidateUserId: schema.recruitmentJobCandidates.candidateUserId,
        anonymousLabel: schema.recruitmentJobCandidates.anonymousLabel,
        hireDate: schema.recruitmentJobCandidates.hireDate,
        stageKey: schema.recruitmentStagesSchema.stageKey,
        requesterId: schema.recruitmentJobsSchema.requesterId,
        probationPeriodDays: schema.recruitmentJobsSchema.probationPeriodDays,
        intPayoutWaits: schema.recruitmentJobPricesSchema.intPayoutWaits,
        extPayoutWaits: schema.recruitmentJobPricesSchema.extPayoutWaits,
        intConnectorPayoutWaitDays:
          schema.recruitmentJobPricesSchema.intConnectorPayoutWaitDays,
        extConnectorPayoutWaitDays:
          schema.recruitmentJobPricesSchema.extConnectorPayoutWaitDays,
        flatReferralAmount:
          schema.recruitmentJobPricesSchema.flatReferralAmount,
        candidateFirstName: schema.users.firstName,
        candidateLastName: schema.users.lastName,
        candidateFullName: schema.users.fullName,
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
      .leftJoin(
        schema.users,
        eq(schema.recruitmentJobCandidates.candidateUserId, schema.users.id)
      )
      .leftJoin(
        schema.recruitmentStagesSchema,
        eq(
          schema.recruitmentJobCandidates.stageId,
          schema.recruitmentStagesSchema.id
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

    const candidateLabel = this.buildCandidateLabel(candidate);

    const { probationEndsAt, probationElapsed } = computeProbation({
      hireDate: candidate.hireDate,
      probationPeriodDays: candidate.probationPeriodDays,
    });
    // Connector windows are per type (int/ext) and computed per connector row
    // below from that row's classification.
    const waitContext = {
      hireDate: candidate.hireDate,
      intConnectorPayoutWaitDays: candidate.intConnectorPayoutWaitDays,
      extConnectorPayoutWaitDays: candidate.extConnectorPayoutWaitDays,
    };
    const timingFlags = {
      intPayoutWaits: candidate.intPayoutWaits === true,
      extPayoutWaits: candidate.extPayoutWaits === true,
    };

    // Connector mappings — identity + classification. Withheld until the
    // candidate reaches the classification window (`interview_completed`, where
    // the Move-to-Hired dialog opens) so this endpoint cannot be used to look up
    // who referred a candidate earlier in the pipeline. Payout rows only ever
    // exist post-hire, so an empty list before then costs the UI nothing.
    const connectorsVisible = isConnectorClassificationStage(
      candidate.stageKey
    );

    const connectorRows = !connectorsVisible
      ? []
      : await this.db
          .select({
            connectorUserId:
              schema.recruitmentCandidateConnectors.connectorUserId,
            role: schema.recruitmentCandidateConnectors.role,
            classificationType:
              schema.recruitmentCandidateConnectors.classificationType,
            isActiveEmployee:
              schema.recruitmentCandidateConnectors.isActiveEmployee,
            firstName: schema.users.firstName,
            lastName: schema.users.lastName,
            fullName: schema.users.fullName,
            profilePhoto: schema.users.profilePhotoUrl,
            jobTitle: schema.users.jobTitle,
            company: schema.users.company,
            linkedinUrl: schema.users.linkedinUrl,
          })
          .from(schema.recruitmentCandidateConnectors)
          .leftJoin(
            schema.users,
            eq(
              schema.recruitmentCandidateConnectors.connectorUserId,
              schema.users.id
            )
          )
          .where(
            and(
              eq(
                schema.recruitmentCandidateConnectors.candidateId,
                candidateId
              ),
              isNull(schema.recruitmentCandidateConnectors.deletedAt)
            )
          );

    // All payout rows for this candidate.
    const payoutRows = await this.db
      .select({
        id: schema.recruitmentPayoutHistory.id,
        recipientId: schema.recruitmentPayoutHistory.recipientId,
        payoutType: schema.recruitmentPayoutHistory.payoutType,
        status: schema.recruitmentPayoutHistory.status,
        processingStatus: schema.recruitmentPayoutHistory.processingStatus,
        grossAmount: schema.recruitmentPayoutHistory.grossAmount,
        recipientAmount: schema.recruitmentPayoutHistory.recipientAmount,
        outboundPaymentId:
          schema.recruitmentPayoutHistory.stripeOutboundPaymentId,
        cancellationReason: schema.recruitmentPayoutHistory.cancellationReason,
        cancellationNotes: schema.recruitmentPayoutHistory.cancellationNotes,
        completedAt: schema.recruitmentPayoutHistory.completedAt,
        updatedAt: schema.recruitmentPayoutHistory.updatedAt,
      })
      .from(schema.recruitmentPayoutHistory)
      .where(
        and(
          eq(schema.recruitmentPayoutHistory.candidateId, candidateId),
          isNull(schema.recruitmentPayoutHistory.deletedAt)
        )
      );

    const payoutByRecipient = new Map(
      payoutRows.map((p) => [p.recipientId, p])
    );

    // Top-ups already collected for this candidate. A fee can be raised more than
    // once before the payout is released, so each fee type may have several.
    const [flatTopUpFunded, successFeeTopUpFunded] = await Promise.all([
      this.flatTopupService.getFundedTopUpSummary(this.db, candidateId),
      this.successFeeTopupService.getFundedTopUpSummary(this.db, candidateId),
    ]);

    // Per connector-payout-row top-up preview: the extra HR must pay before the
    // connector can be paid the CURRENT Flat Referral Fee. Only for still-pending
    // connector rows (a queued/completed payout is frozen). Display-only — the
    // charge is recomputed server-side at the Pay step.
    const topUpByPayoutId = await this.computeConnectorTopUps(
      candidateId,
      candidate.flatReferralAmount,
      payoutRows
    );

    // What an actionable connector row will actually pay out. The stored
    // `recipientAmount` is the hire-time snapshot and is only re-priced in the
    // release transaction, so without this the dialog shows the OLD payout even
    // after the recruiter has paid the top-up for a raised fee. Mirrors the
    // re-pricing in RecruitmentPayoutReleaseService's Tx2 exactly.
    const connectorRepriced =
      candidate.flatReferralAmount == null
        ? null
        : this.feeConfig.getConnectorPayoutBreakdown(
            Number(candidate.flatReferralAmount),
            SINGLE_CONNECTOR_SHARE_PERCENT
          ).recipientAmount;

    // Build connector entries
    const connectors: PayoutStateConnector[] = connectorRows.map((c) => {
      const payoutRow = payoutByRecipient.get(c.connectorUserId);
      const classificationType =
        c.classificationType === "internal" ||
        c.classificationType === "external"
          ? c.classificationType
          : null;

      const { connectorWaitEndsAt, connectorWaitElapsed } =
        computeConnectorWaitWindow({ classificationType }, waitContext);

      const payout: PayoutRowState | null = payoutRow
        ? {
            id: payoutRow.id,
            status: this.deriveDisplayStatus(
              payoutRow.status,
              payoutRow.processingStatus
            ),
            failureReason: toSafeFailureReason(payoutRow.processingStatus),
            // Frozen rows (queued/completed/cancelled) keep their snapshot — they
            // are never re-priced. Actionable rows show the latest fee.
            recipientAmount:
              connectorRepriced !== null &&
              isActionablePayoutRow(
                payoutRow.status,
                payoutRow.processingStatus
              )
                ? connectorRepriced
                : payoutRow.recipientAmount,
            outboundPaymentId: payoutRow.outboundPaymentId ?? null,
            cancellationReason:
              (payoutRow.cancellationReason as RecruitmentPayoutCancellationReason) ??
              null,
            cancellationNotes: payoutRow.cancellationNotes ?? null,
            canReleaseNow:
              payoutRow.status === "pending"
                ? canReleaseConnectorNow(
                    { classificationType },
                    timingFlags,
                    connectorWaitElapsed
                  )
                : false,
            waitEndsAt: connectorWaitEndsAt?.toISOString() ?? null,
            connectorTopUp: topUpByPayoutId.get(payoutRow.id) ?? null,
            candidateTopUp: null,
            completedAt: payoutRow.completedAt?.toISOString() ?? null,
            updatedAt: payoutRow.updatedAt?.toISOString() ?? null,
          }
        : null;

      return {
        connectorUserId: c.connectorUserId,
        name: this.buildConnectorName(c),
        role: c.role as "primary" | "claimer" | "sharer",
        classificationType,
        isActiveEmployee: c.isActiveEmployee ?? null,
        avatar: c.profilePhoto
          ? this.mediaService.getFullS3Url(c.profilePhoto)
          : null,
        jobTitle: c.jobTitle ?? null,
        company: c.company ?? null,
        linkedinUrl: c.linkedinUrl ?? null,
        payout,
      };
    });

    // Candidate row (success-fee payout — recipientId = candidateUserId). The
    // bonus is re-priced to the LATEST Success Fee at release, so a still-pending
    // row shows the latest amount (what the candidate receives) plus the top-up HR
    // will be charged now. Frozen rows keep their snapshot.
    const candidatePayoutRow = payoutRows.find(
      (p) => p.payoutType === RECRUITMENT_PAYOUT_TYPE.CANDIDATE
    );
    const candidatePreview = await this.computeCandidateSuccessFeePreview(
      candidate.jobId,
      candidateId,
      candidatePayoutRow
    );
    const candidatePayout: PayoutRowState | null = candidatePayoutRow
      ? {
          id: candidatePayoutRow.id,
          status: this.deriveDisplayStatus(
            candidatePayoutRow.status,
            candidatePayoutRow.processingStatus
          ),
          failureReason: toSafeFailureReason(
            candidatePayoutRow.processingStatus
          ),
          recipientAmount:
            candidatePreview?.latestAmount ??
            candidatePayoutRow.recipientAmount,
          outboundPaymentId: candidatePayoutRow.outboundPaymentId ?? null,
          cancellationReason:
            (candidatePayoutRow.cancellationReason as RecruitmentPayoutCancellationReason) ??
            null,
          cancellationNotes: candidatePayoutRow.cancellationNotes ?? null,
          canReleaseNow:
            candidatePayoutRow.status === "pending"
              ? canReleaseCandidateNow(probationElapsed)
              : false,
          waitEndsAt: probationEndsAt?.toISOString() ?? null,
          // Candidate bonus is not tied to the referral fee.
          connectorTopUp: null,
          candidateTopUp: candidatePreview?.candidateTopUp ?? null,
          completedAt: candidatePayoutRow.completedAt?.toISOString() ?? null,
          updatedAt: candidatePayoutRow.updatedAt?.toISOString() ?? null,
        }
      : null;

    return {
      candidateId,
      candidateLabel,
      hireDate: candidate.hireDate?.toISOString() ?? null,
      probationPeriodDays: candidate.probationPeriodDays ?? null,
      probationEndsAt: probationEndsAt?.toISOString() ?? null,
      intConnectorPayoutWaitDays: candidate.intConnectorPayoutWaitDays ?? null,
      extConnectorPayoutWaitDays: candidate.extConnectorPayoutWaitDays ?? null,
      intPayoutWaits: timingFlags.intPayoutWaits,
      extPayoutWaits: timingFlags.extPayoutWaits,
      connectors,
      candidatePayout,
      connectorTopUpFunded: this.toFundedTopUp(flatTopUpFunded),
      candidateTopUpFunded: this.toFundedTopUp(successFeeTopUpFunded),
    };
  }

  private toFundedTopUp(
    row: { amount: number; paidAt: Date | null; count: number } | null
  ): PayoutTopUpFunded | null {
    if (!row) return null;
    return {
      amount: row.amount.toFixed(2),
      paidAt: row.paidAt?.toISOString() ?? null,
    };
  }

  // Read-only top-up preview per pending connector payout row. Returns a map of
  // payoutRowId -> 2-decimal dollar string for rows where the current Flat
  // Referral Fee is HIGHER than the fee the row was snapshotted at (i.e. HR
  // raised the fee after hire). Mirrors the release-time math
  // (RecruitmentFlatTopupService.computeTopUp) but without a lock. Unchanged or
  // lowered fees produce no entry, and so does an already-funded top-up.
  private async computeConnectorTopUps(
    candidateId: string,
    flatReferralAmount: string | null,
    payoutRows: Array<{
      id: string;
      payoutType: string;
      status: string;
      processingStatus: string | null;
      grossAmount: string | null;
    }>
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (flatReferralAmount == null) {
      return result;
    }

    // Only rows a release could still act on — a queued/processing/completed
    // payout is frozen at its snapshot and never re-priced. Mirrors the release
    // service's actionable filter, which includes a recoverable 'failed' row
    // (the retry path): a retry IS re-priced and charged, so its top-up must be
    // previewed too, or the charge would be invisible until it happened.
    const eligible = payoutRows.filter(
      (p) =>
        p.payoutType === RECRUITMENT_PAYOUT_TYPE.CONNECTOR &&
        p.status === "pending" &&
        (p.processingStatus === null ||
          p.processingStatus === RECRUITMENT_PROCESSING_STATUS.PENDING ||
          p.processingStatus === RECRUITMENT_PROCESSING_STATUS.FAILED)
    );
    if (eligible.length === 0) return result;

    const currentFee = Number(flatReferralAmount);
    const newTotal = (
      await this.flatReferralFeeService.calculateFlatReferralFee(currentFee)
    ).total;

    // What this candidate has been funded to so far, on top of the hire fee.
    // Netting this off is what makes a SECOND raise show its own delta rather
    // than either re-billing the first one or vanishing entirely.
    const collected = await this.flatTopupService.sumCapturedTopUps(
      this.db,
      candidateId
    );

    // Cache total() by base fee — split rows share one hire-time snapshot, so
    // this is usually a single computation. A 0/missing snapshot means unfunded
    // (and calculateFlatReferralFee throws on <= 0).
    const totalByBaseFee = new Map<number, number>();
    for (const row of eligible) {
      const oldBaseFee = Number(row.grossAmount ?? "0");
      let oldTotal = totalByBaseFee.get(oldBaseFee);
      if (oldTotal === undefined) {
        oldTotal =
          oldBaseFee > 0
            ? (
                await this.flatReferralFeeService.calculateFlatReferralFee(
                  oldBaseFee
                )
              ).total
            : 0;
        totalByBaseFee.set(oldBaseFee, oldTotal);
      }
      const topUp = this.flatReferralFeeService.roundTopUpDiff(
        newTotal,
        Math.round((oldTotal + collected) * 100) / 100
      );
      if (topUp > 0) result.set(row.id, topUp.toFixed(2));
    }
    return result;
  }

  // Read-only preview for a still-pending candidate bonus: the LATEST Success Fee
  // it will be re-priced to at release, plus the top-up HR will be charged now.
  // Mirrors the release-time math (RecruitmentSuccessFeeTopupService) without a
  // lock. Returns null for frozen (non-pending) rows and jobs with no Success Fee.
  private async computeCandidateSuccessFeePreview(
    jobId: string,
    candidateId: string,
    candidatePayoutRow:
      | { status: string; processingStatus: string | null }
      | undefined
  ): Promise<{ latestAmount: string; candidateTopUp: string | null } | null> {
    if (!candidatePayoutRow) return null;

    // Same actionable set as the release service — a recoverable 'failed' row is
    // retryable, and a retry is re-priced and charged, so it needs a preview.
    const isPending =
      candidatePayoutRow.status === "pending" &&
      (candidatePayoutRow.processingStatus === null ||
        candidatePayoutRow.processingStatus ===
          RECRUITMENT_PROCESSING_STATUS.PENDING ||
        candidatePayoutRow.processingStatus ===
          RECRUITMENT_PROCESSING_STATUS.FAILED);
    if (!isPending) return null;

    const topUp = await this.successFeeTopupService.computeSuccessFeeTopUp(
      this.db,
      { jobId, candidateId }
    );
    if (!topUp) return null;

    return {
      // The candidate's share of the latest Success Fee — same split the release
      // transaction applies (100% today, but read it rather than assume).
      latestAmount: this.feeConfig.splitAmount(
        topUp.latest,
        this.feeConfig.getCandidateSuccessFeeRecipientPercent()
      ),
      candidateTopUp: topUp.topUp > 0 ? topUp.topUp.toFixed(2) : null,
    };
  }

  // Surface processingStatus='onboarding_pending' as its own display status
  // so the UI can render the dedicated "Awaiting Stripe Connect setup" pill
  // (the underlying row is still 'pending' on the lifecycle status column).
  private deriveDisplayStatus(
    status: string,
    processingStatus: string | null
  ): RecruitmentPayoutRowStatus {
    if (processingStatus === RECRUITMENT_PROCESSING_STATUS.ONBOARDING_PENDING) {
      return "onboarding_pending";
    }
    if (processingStatus === RECRUITMENT_PROCESSING_STATUS.QUEUED) {
      return "queued";
    }
    if (processingStatus === RECRUITMENT_PROCESSING_STATUS.PROCESSING) {
      return "processing";
    }
    // A failed transfer keeps status='pending' on the lifecycle column but is
    // signalled via processingStatus. Surface it (and its non-retryable
    // manual_review sibling) so the UI shows the correct pill and the retry
    // affordance instead of a misleading "pending".
    if (processingStatus === RECRUITMENT_PROCESSING_STATUS.MANUAL_REVIEW) {
      return "manual_review";
    }
    if (processingStatus === RECRUITMENT_PROCESSING_STATUS.FAILED) {
      return "failed";
    }
    if (status === "completed") return "completed";
    if (status === "cancelled") return "cancelled";
    if (status === "failed") return "failed";
    return "pending";
  }

  private buildConnectorName(c: {
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
  }): string {
    if (c.fullName) return c.fullName;
    const parts = [c.firstName, c.lastName].filter(Boolean) as string[];
    return parts.length > 0 ? parts.join(" ") : "Connector";
  }

  private buildCandidateLabel(c: {
    anonymousLabel: string | null;
    candidateFirstName: string | null;
    candidateLastName: string | null;
    candidateFullName: string | null;
  }): string {
    if (c.candidateFullName) return c.candidateFullName;
    const parts = [c.candidateFirstName, c.candidateLastName].filter(
      Boolean
    ) as string[];
    if (parts.length > 0) return parts.join(" ");
    return c.anonymousLabel ?? "Candidate";
  }
}
