import { Injectable, Logger, Inject, NotFoundException } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import {
  eq,
  ne,
  and,
  isNull,
  count,
  gte,
  lte,
  or,
  ilike,
  asc,
  desc,
} from "drizzle-orm";
import { RECRUITMENT_PAYOUT_STATUS } from "modules/recruitment/payout/recruitment-payout.constants";
import { getDateRangeFromPreset } from "modules/finances/finances.utils";
import { DatePresetEnum } from "modules/finances/finances.constants";
import { RECRUITMENT_PAYOUT_TYPE } from "modules/recruitment/payout/recruitment-payout.constants";
import type {
  CandidateBonusListResponse,
  CandidateBonusDetailResponse,
  CandidateBonusProcessingStatus,
  CandidateBonusPayoutStatus,
  CandidateBonusTimelineEvent,
} from "./candidate-bonus.response";
import { CandidateBonusQueryDto } from "./candidate-bonus.dto";
import {
  CandidateBonusStatusEnum,
  CandidateBonusSortFieldEnum,
  CandidateBonusSortOrderEnum,
  CANDIDATE_BONUS_CANCELLATION_LABELS,
  CANDIDATE_BONUS_FALLBACK_CANCELLATION_LABEL,
  CANDIDATE_BONUS_MESSAGES,
} from "./candidate-bonus.constants";

/**
 * Candidate Bonus — the success-fee payout a hired candidate earns.
 *
 * Lean service (list + detail only, no stats). Every query is scoped to the
 * authenticated user via `recipient_id = :userId` AND
 * `payout_type = 'candidate'` — the userId always comes from the JWT, never
 * from the client, so a candidate can only ever see their own bonuses. The
 * detail endpoint returns 404 on a miss (rather than 403) so payout ids
 * cannot be enumerated.
 */
@Injectable()
export class CandidateBonusService {
  private readonly logger = new Logger(CandidateBonusService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getList(
    userId: string,
    query: CandidateBonusQueryDto
  ): Promise<CandidateBonusListResponse> {
    this.logger.log(CANDIDATE_BONUS_MESSAGES.INFO.FETCHING_LIST(userId));

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 50);
    const offset = (page - 1) * limit;
    const search = query.search?.trim();

    const ph = schema.recruitmentPayoutHistory;
    const jobs = schema.recruitmentJobsSchema;

    const conditions = this.buildConditions(userId, query, search);
    const orderBy = this.buildOrderBy(query);

    const [rows, [totalResult]] = await Promise.all([
      this.db
        .select({
          id: ph.id,
          jobTitle: jobs.title,
          companyName: jobs.companyName,
          earnedAmount: ph.recipientAmount,
          processingStatus: ph.processingStatus,
          payoutStatus: ph.status,
          createdAt: ph.createdAt,
        })
        .from(ph)
        .innerJoin(jobs, eq(ph.jobId, jobs.id))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(ph)
        .innerJoin(jobs, eq(ph.jobId, jobs.id))
        .where(and(...conditions)),
    ]);

    const total = Number(totalResult?.total ?? 0);

    return {
      bonuses: rows.map((row) => ({
        id: row.id,
        jobTitle: row.jobTitle,
        companyName: row.companyName,
        earnedAmount: row.earnedAmount ?? null,
        processingStatus:
          row.processingStatus as CandidateBonusProcessingStatus,
        payoutStatus: row.payoutStatus as CandidateBonusPayoutStatus,
        createdAt: row.createdAt.toISOString(),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getDetail(
    id: string,
    userId: string
  ): Promise<CandidateBonusDetailResponse> {
    this.logger.log(CANDIDATE_BONUS_MESSAGES.INFO.FETCHING_DETAIL(id, userId));

    const ph = schema.recruitmentPayoutHistory;
    const jobs = schema.recruitmentJobsSchema;

    const rows = await this.db
      .select({
        id: ph.id,
        jobTitle: jobs.title,
        companyName: jobs.companyName,
        earnedAmount: ph.recipientAmount,
        processingStatus: ph.processingStatus,
        payoutStatus: ph.status,
        createdAt: ph.createdAt,
        updatedAt: ph.updatedAt,
        processingStartedAt: ph.processingStartedAt,
        processingCompletedAt: ph.processingCompletedAt,
        cancellationReason: ph.cancellationReason,
        cancellationNotes: ph.cancellationNotes,
      })
      .from(ph)
      .innerJoin(jobs, eq(ph.jobId, jobs.id))
      .where(
        and(
          eq(ph.id, id),
          eq(ph.recipientId, userId),
          eq(ph.payoutType, RECRUITMENT_PAYOUT_TYPE.CANDIDATE),
          isNull(ph.deletedAt)
        )
      )
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException(
        CANDIDATE_BONUS_MESSAGES.ERROR.BONUS_NOT_FOUND
      );
    }

    const [row] = rows;
    const isCancelled = row.payoutStatus === "cancelled";

    const cancellationReasonLabel =
      isCancelled && row.cancellationReason
        ? (CANDIDATE_BONUS_CANCELLATION_LABELS[row.cancellationReason] ??
          CANDIDATE_BONUS_FALLBACK_CANCELLATION_LABEL)
        : null;

    return {
      id: row.id,
      jobTitle: row.jobTitle,
      companyName: row.companyName,
      earnedAmount: row.earnedAmount ?? null,
      processingStatus: row.processingStatus as CandidateBonusProcessingStatus,
      payoutStatus: row.payoutStatus as CandidateBonusPayoutStatus,
      createdAt: row.createdAt.toISOString(),
      timeline: this.buildTimeline(row),
      cancellationReasonLabel,
      cancellationNotes: isCancelled ? (row.cancellationNotes ?? null) : null,
      // Cancellation has no dedicated timestamp — the cancel write stamps
      // `updatedAt`, so we surface that as the cancelled date.
      cancelledAt: isCancelled ? row.updatedAt.toISOString() : null,
    };
  }

  /**
   * Base filters: self-only (`recipientId = userId`), candidate payout type,
   * not soft-deleted, optional status/date/search.
   *
   * `recipientId` is always the authenticated user id — never a value from the
   * query/body/params — so users can only see their own bonuses.
   */
  private buildConditions(
    userId: string,
    query: CandidateBonusQueryDto,
    search?: string
  ) {
    const ph = schema.recruitmentPayoutHistory;
    const jobs = schema.recruitmentJobsSchema;

    const conditions = [
      eq(ph.recipientId, userId),
      eq(ph.payoutType, RECRUITMENT_PAYOUT_TYPE.CANDIDATE),
      isNull(ph.deletedAt),
    ];

    if (query.status === CandidateBonusStatusEnum.CANCELLED) {
      // Cancellation is tracked on `status`, not `processingStatus`.
      conditions.push(eq(ph.status, RECRUITMENT_PAYOUT_STATUS.CANCELLED));
    } else if (query.status && query.status !== CandidateBonusStatusEnum.ALL) {
      // Processing-status filters exclude cancelled rows so the badge the user
      // filtered for always matches what they see (a cancelled row renders a
      // Cancelled badge regardless of its underlying processingStatus).
      conditions.push(
        eq(ph.processingStatus, query.status),
        ne(ph.status, RECRUITMENT_PAYOUT_STATUS.CANCELLED)
      );
    }

    const datePreset = query.datePreset ?? DatePresetEnum.ALL;
    const { start, end } = getDateRangeFromPreset(
      datePreset,
      query.startDate,
      query.endDate
    );
    // Guard against an `Invalid Date` slipping through — it is truthy, so a
    // bare `if (start)` would push a broken bound into gte/lte. DTO-level
    // `@IsDateString` rejects bad input upstream; this is defense in depth.
    if (start && !Number.isNaN(start.getTime()))
      conditions.push(gte(ph.createdAt, start));
    if (end && !Number.isNaN(end.getTime()))
      conditions.push(lte(ph.createdAt, end));

    if (search) {
      const escaped = this.escapeLikePattern(search);
      conditions.push(
        or(
          ilike(jobs.title, `%${escaped}%`),
          ilike(jobs.companyName, `%${escaped}%`)
        )!
      );
    }

    return conditions;
  }

  private buildOrderBy(query: CandidateBonusQueryDto) {
    const ph = schema.recruitmentPayoutHistory;
    const sortOrder = query.sortOrder ?? CandidateBonusSortOrderEnum.DESC;
    const dirFn = sortOrder === CandidateBonusSortOrderEnum.ASC ? asc : desc;

    switch (query.sortBy) {
      case CandidateBonusSortFieldEnum.AMOUNT:
        return dirFn(ph.recipientAmount);
      case CandidateBonusSortFieldEnum.STATUS:
        return dirFn(ph.processingStatus);
      case CandidateBonusSortFieldEnum.DATE:
      default:
        return dirFn(ph.createdAt);
    }
  }

  /**
   * Timeline derived from the row's timestamps + statuses. A cancelled bonus
   * gets a terminal "Bonus Cancelled" step stamped with `updatedAt`.
   */
  private buildTimeline(row: {
    createdAt: Date;
    updatedAt: Date;
    processingStartedAt: Date | null;
    processingCompletedAt: Date | null;
    processingStatus: string;
    payoutStatus: string;
  }): CandidateBonusTimelineEvent[] {
    const events: CandidateBonusTimelineEvent[] = [
      { event: "Bonus Created", date: row.createdAt.toISOString() },
    ];

    if (row.payoutStatus === "cancelled") {
      events.push({
        event: "Bonus Cancelled",
        date: row.updatedAt.toISOString(),
      });
      return events;
    }

    if (row.processingStatus === "onboarding_pending") {
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
        event: "Bonus Paid",
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

  private escapeLikePattern(str: string): string {
    return str.replace(/[%_]/g, (match) => `\\${match}`);
  }
}
