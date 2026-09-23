import { Injectable, Logger, Inject, NotFoundException } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq, and, isNull } from "drizzle-orm";
import { RecruitmentFeeConfigService } from "modules/recruitment/fee-config/recruitment-fee-config.service";
import { toSafeFailureReason } from "modules/recruitment/payout/recruitment-payout.constants";
import type {
  ConnectorEarningDetailResponse,
  ConnectorEarningProcessingStatus,
  ConnectorEarningTimelineEvent,
} from "../connector-earning.response";
import { CONNECTOR_EARNING_MESSAGES } from "../connector-earning.constants";

/**
 * Detail for a single connector earning row.
 *
 * Authorization: scoped strictly to the authenticated user via
 * `recipient_id = :userId`. On miss we return 404 (rather than 403) so an
 * attacker cannot enumerate valid payout ids.
 *
 * This is the heavy query: it joins pricing for the job bounty and the
 * current user's `recruitment_candidate_connectors` row to pull role and
 * share percent. Both are used to cross-check the `isShared` flag from the
 * payout history row — if they disagree we log a warning so we can spot
 * data drift, and prefer the candidate_connectors signal (authoritative).
 */
@Injectable()
export class EarningDetailService {
  private readonly logger = new Logger(EarningDetailService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly feeConfig: RecruitmentFeeConfigService
  ) {}

  async getDetail(
    id: string,
    userId: string
  ): Promise<ConnectorEarningDetailResponse> {
    this.logger.log(
      CONNECTOR_EARNING_MESSAGES.INFO.FETCHING_DETAIL(id, userId)
    );

    const ph = schema.recruitmentPayoutHistory;
    const jobs = schema.recruitmentJobsSchema;
    const candidates = schema.recruitmentJobCandidates;
    const rcc = schema.recruitmentCandidateConnectors;

    const rows = await this.db
      .select({
        id: ph.id,
        jobTitle: jobs.title,
        companyName: jobs.companyName,
        candidateLabel: candidates.anonymousLabel,
        processingStatus: ph.processingStatus,
        isMarketplaceDeal: ph.isMarketplaceDeal,
        createdAt: ph.createdAt,
        processingStartedAt: ph.processingStartedAt,
        processingCompletedAt: ph.processingCompletedAt,
        retryCount: ph.retryCount,
        grossAmount: ph.grossAmount,
        recipientAmount: ph.recipientAmount,
        creditsApplied: ph.creditsApplied,
        creditsRemainingAfter: ph.creditsRemainingAfter,
        commissionAfterCredits: ph.commissionAfterCredits,
        connectorRole: rcc.role,
        connectorSharePercent: rcc.sharePercent,
      })
      .from(ph)
      .innerJoin(jobs, eq(ph.jobId, jobs.id))
      .innerJoin(candidates, eq(ph.candidateId, candidates.id))
      .leftJoin(
        rcc,
        and(
          eq(rcc.candidateId, ph.candidateId),
          eq(rcc.connectorUserId, userId),
          isNull(rcc.deletedAt)
        )
      )
      .where(
        and(
          eq(ph.id, id),
          eq(ph.recipientId, userId),
          eq(ph.payoutType, "connector"),
          isNull(ph.deletedAt)
        )
      )
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException(
        CONNECTOR_EARNING_MESSAGES.ERROR.PAYOUT_NOT_FOUND
      );
    }

    const row = rows[0];

    // Cross-check: trust candidate_connectors.role if present, otherwise
    // fall back to the denormalized flag on payout history.
    const hasNonPrimaryRole =
      row.connectorRole !== null && row.connectorRole !== "primary";
    const isShared = row.isMarketplaceDeal || hasNonPrimaryRole;

    if (row.isMarketplaceDeal !== hasNonPrimaryRole && row.connectorRole) {
      this.logger.warn(CONNECTOR_EARNING_MESSAGES.WARN.SPLIT_DRIFT(row.id));
    }

    // For shared earnings, expose the pre-split connector pool so the UI can
    // explain why the recipient got less than the marketplace-advertised
    // payout. For solo earnings these stay null and the breakdown collapses.
    const originalAmount = isShared
      ? this.feeConfig.getConnectorPayoutAmount(Number(row.grossAmount), 100)
      : null;
    const yourShareAmount = isShared ? row.recipientAmount : null;

    return {
      id: row.id,
      jobTitle: row.jobTitle,
      companyName: row.companyName,
      candidateLabel: row.candidateLabel ?? "Unknown Candidate",
      earnedAmount: row.recipientAmount ?? null,
      creditsApplied: row.creditsApplied ?? "0",
      processingStatus:
        row.processingStatus as ConnectorEarningProcessingStatus,
      isShared,
      createdAt: row.createdAt.toISOString(),
      breakdown: {
        originalAmount,
        yourShareAmount,
        creditsApplied: row.creditsApplied,
        creditsRemainingAfter: row.creditsRemainingAfter,
      },
      timeline: this.buildTimeline(row),
      failureReason: toSafeFailureReason(row.processingStatus),
      retryCount: row.retryCount ?? 0,
      role: row.connectorRole ?? null,
      sharePercent: row.connectorSharePercent ?? null,
    };
  }

  private buildTimeline(row: {
    createdAt: Date;
    processingStartedAt: Date | null;
    processingCompletedAt: Date | null;
    processingStatus: string;
  }): ConnectorEarningTimelineEvent[] {
    const events: ConnectorEarningTimelineEvent[] = [
      { event: "Payout Created", date: row.createdAt.toISOString() },
    ];

    if (row.processingStatus === "onboarding_pending") {
      // Derived event with no real timestamp — frontend renders it as
      // "in progress" with the special badge/tooltip.
      events.push({ event: "Awaiting Stripe Setup", date: null });
    }

    if (row.processingStartedAt) {
      events.push({
        event: "Processing Started",
        date: row.processingStartedAt.toISOString(),
      });
    }

    if (row.processingStatus === "completed" && row.processingCompletedAt) {
      events.push({
        event: "Payout Completed",
        date: row.processingCompletedAt.toISOString(),
      });
    }

    if (row.processingStatus === "failed") {
      events.push({
        event: "Payout Failed",
        date: row.processingCompletedAt?.toISOString() ?? null,
      });
    }

    return events;
  }
}
