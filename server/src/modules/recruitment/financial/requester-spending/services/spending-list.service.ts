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
import type { SpendingListResponse } from "../requester-spending.response";
import {
  groupSpendingRows,
  type SpendingListRow,
} from "./spending-list.mapper";
import { RequesterSpendingQueryDto } from "../requester-spending.dto";
import {
  RequesterSpendingStatusEnum,
  RequesterSpendingSortFieldEnum,
  RequesterSpendingSortOrderEnum,
  REQUESTER_SPENDING_MESSAGES,
  REQUESTER_SPENDING_TXN_TYPES,
} from "../requester-spending.constants";

type InterviewTxn = typeof schema.recruitmentInterviewTransactions;

@Injectable()
export class SpendingListService {
  private readonly logger = new Logger(SpendingListService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getList(
    userId: string,
    query: RequesterSpendingQueryDto
  ): Promise<SpendingListResponse> {
    this.logger.log(REQUESTER_SPENDING_MESSAGES.INFO.FETCHING_LIST(userId));

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 50);
    const offset = (page - 1) * limit;
    const search = query.search?.trim();
    const conditions = this.buildConditions(userId, query, search);

    return this.db.transaction(
      async (tx) => {
        const txn = schema.recruitmentInterviewTransactions;
        const jobs = schema.recruitmentJobsSchema;
        const candidates = schema.recruitmentJobCandidates;
        const jobTotal = sql<string>`COALESCE(SUM(${txn.totalAmount}), 0)`;
        const latestTransactionAt = sql<Date>`MAX(${txn.createdAt})`;
        const groupedStatusRank = this.buildGroupedStatusRank(txn);
        const jobOrderBy = this.buildJobOrderBy(
          query,
          jobTotal,
          latestTransactionAt,
          groupedStatusRank
        );

        const [jobRows, [totalResult]] = await Promise.all([
          tx
            .select({
              jobId: jobs.id,
              jobTitle: jobs.title,
              companyName: jobs.companyName,
              totalAmount: jobTotal,
            })
            .from(txn)
            .innerJoin(jobs, eq(txn.jobId, jobs.id))
            .innerJoin(candidates, eq(txn.candidateId, candidates.id))
            .leftJoin(
              schema.users,
              eq(candidates.candidateUserId, schema.users.id)
            )
            .where(and(...conditions))
            .groupBy(jobs.id, jobs.title, jobs.companyName)
            .orderBy(...jobOrderBy)
            .limit(limit)
            .offset(offset),
          tx
            .select({ total: countDistinct(txn.jobId) })
            .from(txn)
            .innerJoin(jobs, eq(txn.jobId, jobs.id))
            .innerJoin(candidates, eq(txn.candidateId, candidates.id))
            .leftJoin(
              schema.users,
              eq(candidates.candidateUserId, schema.users.id)
            )
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
        const transactionRows = await tx
          .select({
            id: txn.id,
            jobId: jobs.id,
            candidateId: candidates.id,
            candidateLabel: candidates.anonymousLabel,
            candidateFirstName: schema.users.firstName,
            candidateLastName: schema.users.lastName,
            candidateEmail: schema.users.email,
            totalAmount: txn.totalAmount,
            status: txn.status,
            transactionType: txn.transactionType,
            createdAt: txn.createdAt,
          })
          .from(txn)
          .innerJoin(jobs, eq(txn.jobId, jobs.id))
          .innerJoin(candidates, eq(txn.candidateId, candidates.id))
          .leftJoin(
            schema.users,
            eq(candidates.candidateUserId, schema.users.id)
          )
          .where(and(...conditions, inArray(txn.jobId, jobIds)))
          .orderBy(...this.buildTransactionOrderBy(query));

        return {
          jobs: groupSpendingRows(
            jobRows,
            transactionRows as SpendingListRow[]
          ),
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
    query: RequesterSpendingQueryDto,
    search?: string
  ) {
    const txn = schema.recruitmentInterviewTransactions;
    const jobs = schema.recruitmentJobsSchema;
    const candidates = schema.recruitmentJobCandidates;
    const { users } = schema;
    const conditions = [
      eq(txn.recruiterId, userId),
      inArray(txn.transactionType, [...REQUESTER_SPENDING_TXN_TYPES]),
      isNull(txn.deletedAt),
      isNull(jobs.deletedAt),
      isNull(candidates.deletedAt),
    ];

    if (query.status && query.status !== RequesterSpendingStatusEnum.ALL) {
      conditions.push(eq(txn.status, query.status));
    }

    const { start, end } = getDateRangeFromPreset(
      query.datePreset ?? DatePresetEnum.ALL,
      query.startDate,
      query.endDate
    );
    if (start) conditions.push(gte(txn.createdAt, start));
    if (end) conditions.push(lte(txn.createdAt, end));

    if (search) {
      conditions.push(
        or(
          ilike(jobs.title, `%${search}%`),
          ilike(candidates.anonymousLabel, `%${search}%`),
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          sql`${txn.totalAmount}::text ILIKE ${`%${search}%`}`
        )!
      );
    }
    return conditions;
  }

  /** Business order: pending → authorized → captured → cancelled. */
  private statusRank(txn: InterviewTxn): SQL<number> {
    return sql<number>`CASE ${txn.status}
      WHEN ${RequesterSpendingStatusEnum.PENDING} THEN 1
      WHEN ${RequesterSpendingStatusEnum.AUTHORIZED} THEN 2
      WHEN ${RequesterSpendingStatusEnum.CAPTURED} THEN 3
      WHEN ${RequesterSpendingStatusEnum.CANCELLED} THEN 4
      ELSE 0
    END`;
  }

  private buildGroupedStatusRank(txn: InterviewTxn): SQL<number> {
    return sql<number>`MAX(${this.statusRank(txn)})`;
  }

  private buildJobOrderBy(
    query: RequesterSpendingQueryDto,
    amount: SQL,
    date: SQL,
    statusRankExpr: SQL<number>
  ) {
    const jobs = schema.recruitmentJobsSchema;
    const dir =
      query.sortOrder === RequesterSpendingSortOrderEnum.ASC ? asc : desc;
    const tieBreaker =
      query.sortOrder === RequesterSpendingSortOrderEnum.ASC
        ? asc(jobs.id)
        : desc(jobs.id);

    if (query.sortBy === RequesterSpendingSortFieldEnum.AMOUNT) {
      return [dir(amount), tieBreaker];
    }
    if (query.sortBy === RequesterSpendingSortFieldEnum.STATUS) {
      return [dir(statusRankExpr), tieBreaker];
    }
    return [dir(date), tieBreaker];
  }

  private buildTransactionOrderBy(query: RequesterSpendingQueryDto) {
    const txn = schema.recruitmentInterviewTransactions;
    const dir =
      query.sortOrder === RequesterSpendingSortOrderEnum.ASC ? asc : desc;
    const tieBreaker =
      query.sortOrder === RequesterSpendingSortOrderEnum.ASC
        ? asc(txn.id)
        : desc(txn.id);

    if (query.sortBy === RequesterSpendingSortFieldEnum.AMOUNT) {
      return [dir(txn.totalAmount), tieBreaker];
    }
    if (query.sortBy === RequesterSpendingSortFieldEnum.STATUS) {
      return [dir(this.statusRank(txn)), tieBreaker];
    }
    return [dir(txn.createdAt), tieBreaker];
  }
}
