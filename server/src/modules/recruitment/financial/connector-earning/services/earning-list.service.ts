import { Injectable, Logger, Inject } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import {
  eq,
  and,
  isNull,
  countDistinct,
  gte,
  lte,
  or,
  ilike,
  asc,
  desc,
  inArray,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDateRangeFromPreset } from "modules/finances/finances.utils";
import { DatePresetEnum } from "modules/finances/finances.constants";
import type { ConnectorEarningListResponse } from "../connector-earning.response";
import { groupEarningRows, type EarningListRow } from "./earning-list.mapper";
import { ConnectorEarningQueryDto } from "../connector-earning.dto";
import {
  ConnectorEarningStatusEnum,
  ConnectorEarningSortFieldEnum,
  ConnectorEarningSortOrderEnum,
  CONNECTOR_EARNING_MESSAGES,
} from "../connector-earning.constants";

type PayoutHistory = typeof schema.recruitmentPayoutHistory;

@Injectable()
export class EarningListService {
  private readonly logger = new Logger(EarningListService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getList(
    userId: string,
    query: ConnectorEarningQueryDto
  ): Promise<ConnectorEarningListResponse> {
    this.logger.log(CONNECTOR_EARNING_MESSAGES.INFO.FETCHING_LIST(userId));

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 50);
    const offset = (page - 1) * limit;
    const search = query.search?.trim();
    const conditions = this.buildConditions(userId, query, search);

    return this.db.transaction(
      async (tx) => {
        const ph = schema.recruitmentPayoutHistory;
        const jobs = schema.recruitmentJobsSchema;
        const candidates = schema.recruitmentJobCandidates;
        const rcc = schema.recruitmentCandidateConnectors;

        const jobTotal = sql<string>`COALESCE(SUM(${ph.recipientAmount}), 0)`;
        const latestPayoutAt = sql<Date>`MAX(${ph.createdAt})`;
        const groupedStatusRank = this.buildGroupedStatusRank(ph);
        const jobOrderBy = this.buildJobOrderBy(
          query,
          jobTotal,
          latestPayoutAt,
          groupedStatusRank
        );

        const isSharedExpr = sql<boolean>`(
          ${ph.isMarketplaceDeal} = TRUE
          OR EXISTS (
            SELECT 1 FROM ${rcc}
            WHERE ${rcc.candidateId} = ${ph.candidateId}
              AND ${rcc.deletedAt} IS NULL
              AND ${rcc.role} <> 'primary'
          )
        )`;

        const [jobRows, [totalResult]] = await Promise.all([
          tx
            .select({
              jobId: jobs.id,
              jobTitle: jobs.title,
              companyName: jobs.companyName,
              totalAmount: jobTotal,
            })
            .from(ph)
            .innerJoin(jobs, eq(ph.jobId, jobs.id))
            .innerJoin(candidates, eq(ph.candidateId, candidates.id))
            .where(and(...conditions))
            .groupBy(jobs.id, jobs.title, jobs.companyName)
            .orderBy(...jobOrderBy)
            .limit(limit)
            .offset(offset),
          tx
            .select({ total: countDistinct(ph.jobId) })
            .from(ph)
            .innerJoin(jobs, eq(ph.jobId, jobs.id))
            .innerJoin(candidates, eq(ph.candidateId, candidates.id))
            .where(and(...conditions)),
        ]);

        const total = Number(totalResult?.total ?? 0);
        if (jobRows.length === 0) {
          return {
            jobs: [],
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          };
        }

        const jobIds = jobRows.map((job) => job.jobId);
        // Payout rows are scoped to the paginated job page (same pattern as
        // requester-spending). Volume is bounded by page limit × candidates/job.
        const payoutRows = await tx
          .select({
            id: ph.id,
            jobId: jobs.id,
            candidateId: candidates.id,
            candidateLabel: candidates.anonymousLabel,
            earnedAmount: ph.recipientAmount,
            creditsApplied: ph.creditsApplied,
            processingStatus: ph.processingStatus,
            isShared: isSharedExpr,
            createdAt: ph.createdAt,
          })
          .from(ph)
          .innerJoin(jobs, eq(ph.jobId, jobs.id))
          .innerJoin(candidates, eq(ph.candidateId, candidates.id))
          .where(and(...conditions, inArray(ph.jobId, jobIds)))
          .orderBy(...this.buildPayoutOrderBy(query));

        return {
          jobs: groupEarningRows(jobRows, payoutRows as EarningListRow[]),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      { isolationLevel: "repeatable read" }
    );
  }

  private buildConditions(
    userId: string,
    query: ConnectorEarningQueryDto,
    search?: string
  ) {
    const ph = schema.recruitmentPayoutHistory;
    const jobs = schema.recruitmentJobsSchema;
    const candidates = schema.recruitmentJobCandidates;

    const conditions = [
      eq(ph.recipientId, userId),
      eq(ph.payoutType, "connector"),
      isNull(ph.deletedAt),
      isNull(jobs.deletedAt),
      isNull(candidates.deletedAt),
    ];

    if (query.status && query.status !== ConnectorEarningStatusEnum.ALL) {
      conditions.push(eq(ph.processingStatus, query.status));
    }

    const { start, end } = getDateRangeFromPreset(
      query.datePreset ?? DatePresetEnum.ALL,
      query.startDate,
      query.endDate
    );
    if (start) conditions.push(gte(ph.createdAt, start));
    if (end) conditions.push(lte(ph.createdAt, end));

    if (search) {
      const escaped = this.escapeLikePattern(search);
      conditions.push(
        or(
          ilike(jobs.title, `%${escaped}%`),
          ilike(jobs.companyName, `%${escaped}%`),
          ilike(candidates.anonymousLabel, `%${escaped}%`),
          sql`${ph.recipientAmount}::text ILIKE ${`%${escaped}%`}`
        )!
      );
    }

    return conditions;
  }

  private statusRank(ph: PayoutHistory): SQL<number> {
    return sql<number>`CASE ${ph.processingStatus}
      WHEN ${ConnectorEarningStatusEnum.PENDING} THEN 1
      WHEN ${ConnectorEarningStatusEnum.ONBOARDING_PENDING} THEN 2
      WHEN 'queued' THEN 3
      WHEN ${ConnectorEarningStatusEnum.PROCESSING} THEN 4
      WHEN ${ConnectorEarningStatusEnum.COMPLETED} THEN 5
      WHEN ${ConnectorEarningStatusEnum.FAILED} THEN 6
      WHEN 'manual_review' THEN 7
      ELSE 0
    END`;
  }

  private buildGroupedStatusRank(ph: PayoutHistory): SQL<number> {
    return sql<number>`MAX(${this.statusRank(ph)})`;
  }

  private buildJobOrderBy(
    query: ConnectorEarningQueryDto,
    amount: SQL,
    date: SQL,
    statusRankExpr: SQL<number>
  ) {
    const jobs = schema.recruitmentJobsSchema;
    const dir =
      query.sortOrder === ConnectorEarningSortOrderEnum.ASC ? asc : desc;
    const tieBreaker =
      query.sortOrder === ConnectorEarningSortOrderEnum.ASC
        ? asc(jobs.id)
        : desc(jobs.id);

    if (query.sortBy === ConnectorEarningSortFieldEnum.AMOUNT) {
      return [dir(amount), tieBreaker];
    }
    if (query.sortBy === ConnectorEarningSortFieldEnum.STATUS) {
      return [dir(statusRankExpr), tieBreaker];
    }
    return [dir(date), tieBreaker];
  }

  private buildPayoutOrderBy(query: ConnectorEarningQueryDto) {
    const ph = schema.recruitmentPayoutHistory;
    const dir =
      query.sortOrder === ConnectorEarningSortOrderEnum.ASC ? asc : desc;
    const tieBreaker =
      query.sortOrder === ConnectorEarningSortOrderEnum.ASC
        ? asc(ph.id)
        : desc(ph.id);

    if (query.sortBy === ConnectorEarningSortFieldEnum.AMOUNT) {
      return [dir(ph.recipientAmount), tieBreaker];
    }
    if (query.sortBy === ConnectorEarningSortFieldEnum.STATUS) {
      return [dir(this.statusRank(ph)), tieBreaker];
    }
    return [dir(ph.createdAt), tieBreaker];
  }

  private escapeLikePattern(str: string): string {
    return str.replace(/[%_]/g, (match) => `\\${match}`);
  }
}
