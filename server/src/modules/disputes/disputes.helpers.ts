import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  and,
  eq,
  ilike,
  or,
  asc,
  desc,
  inArray,
  sql,
  getTableColumns,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import * as schema from "database/schema";
import { QueryDisputeDto } from "./disputes-query.dto";
import {
  DisputeStatusEnum,
  DisputeSortFieldEnum,
  SortOrderEnum,
  DisputeTypeEnum,
  DisputeCategoryEnum,
  DisputePriorityEnum,
  ACTIVE_DISPUTE_STATUSES,
  ELIGIBLE_DISPUTE_INTRODUCTION_STATUSES,
} from "./disputes.constants";

/**
 * Determine dispute category from dispute type
 * @param disputeType - The dispute type
 * @returns The dispute category
 */
export function determineDisputeCategory(disputeType: string): string {
  const categoryMap: Record<string, string> = {
    [DisputeTypeEnum.SERVICE_QUALITY]: DisputeCategoryEnum.SERVICE,
    [DisputeTypeEnum.MEETING_NO_SHOW]: DisputeCategoryEnum.SERVICE,
    [DisputeTypeEnum.MEETING_CANCELLED]: DisputeCategoryEnum.SERVICE,
    [DisputeTypeEnum.UNPROFESSIONAL_CONDUCT]: DisputeCategoryEnum.CONDUCT,
    [DisputeTypeEnum.OTHER]: DisputeCategoryEnum.TECHNICAL,
  };
  return categoryMap[disputeType] || DisputeCategoryEnum.TECHNICAL;
}

/**
 * Build where clause for disputes query
 * @param userId - The user ID
 * @param query - The query DTO
 * @returns The where clause
 */
export function buildDisputesWhereClause(
  userId: string,
  query: QueryDisputeDto
) {
  const conditions = [eq(schema.disputes.filedByUserId, userId)];

  if (query.search) {
    conditions.push(
      or(
        ilike(schema.disputes.reason, `%${query.search}%`),
        ilike(schema.disputes.disputeType, `%${query.search}%`)
      )!
    );
  }

  if (query.introductionRequestId) {
    conditions.push(
      eq(schema.disputes.introductionRequestId, query.introductionRequestId)
    );
  }

  if (query.status) {
    conditions.push(eq(schema.disputes.status, query.status));
  }

  if (query.priority) {
    conditions.push(eq(schema.disputes.priority, query.priority));
  }

  if (query.disputeType) {
    conditions.push(eq(schema.disputes.disputeType, query.disputeType));
  }

  return and(...conditions);
}

/**
 * Build order by clause for disputes query
 * @param sort - The sort field
 * @param order - The sort order
 * @returns The order by clause
 */
export function buildDisputesOrderBy(
  sort: DisputeSortFieldEnum,
  order: SortOrderEnum
) {
  const isAsc = order === SortOrderEnum.ASC;

  if (sort === DisputeSortFieldEnum.UPDATED_AT) {
    return isAsc
      ? asc(schema.disputes.updatedAt)
      : desc(schema.disputes.updatedAt);
  }

  if (sort === DisputeSortFieldEnum.STATUS) {
    return isAsc ? asc(schema.disputes.status) : desc(schema.disputes.status);
  }

  if (sort === DisputeSortFieldEnum.PRIORITY) {
    return isAsc
      ? asc(schema.disputes.priority)
      : desc(schema.disputes.priority);
  }

  if (sort === DisputeSortFieldEnum.DISPUTE_TYPE) {
    return isAsc
      ? asc(schema.disputes.disputeType)
      : desc(schema.disputes.disputeType);
  }

  return isAsc
    ? asc(schema.disputes.createdAt)
    : desc(schema.disputes.createdAt);
}

/**
 * Build create dispute data object
 * @param createDto - The create DTO
 * @param userId - The user ID
 * @param againstUserId - The against user ID
 * @param disputeCategory - The dispute category
 * @returns The create data object
 */
export function buildDisputeCreateData(
  createDto: {
    introductionRequestId: string;
    disputeType: string;
    priority?: string;
    reason: string;
    expectedOutcome?: string;
    evidenceUrls?: string[];
    disputedAmount?: number;
    requestedRefundAmount?: number;
  },
  userId: string,
  againstUserId: string | null,
  disputeCategory: string
): typeof schema.disputes.$inferInsert {
  return {
    introductionRequestId: createDto.introductionRequestId,
    filedByUserId: userId,
    againstUserId: againstUserId || undefined,
    disputeType: createDto.disputeType,
    disputeCategory,
    priority: createDto.priority || DisputePriorityEnum.MEDIUM,
    status: DisputeStatusEnum.PENDING,
    reason: createDto.reason,
    expectedOutcome: createDto.expectedOutcome,
    evidenceUrls: createDto.evidenceUrls,
    disputedAmount: createDto.disputedAmount?.toString(),
    requestedRefundAmount: createDto.requestedRefundAmount?.toString(),
  };
}

/**
 * Get deletable dispute IDs for a user
 * @param db - The database instance
 * @param userId - The user ID
 * @param ids - The dispute IDs to check
 * @returns Array of deletable dispute IDs
 */
export async function getDeletableDisputeIds(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  ids: string[]
): Promise<string[]> {
  const records = await db
    .select()
    .from(schema.disputes)
    .where(
      and(
        eq(schema.disputes.filedByUserId, userId),
        eq(schema.disputes.status, DisputeStatusEnum.PENDING),
        inArray(schema.disputes.id, ids)
      )
    );
  return records.map((r) => r.id);
}

/**
 * Build base query for find all disputes
 * @param db - The database instance
 * @param whereClause - The where clause
 * @param sort - The sort field
 * @param order - The sort order
 * @returns The base query
 */
export function buildFindAllBaseQuery(
  db: PostgresJsDatabase<typeof schema>,
  whereClause: AnyType,
  sort: DisputeSortFieldEnum,
  order: SortOrderEnum
) {
  const againstUser = alias(schema.users, "against_user");

  return db
    .select({
      ...getTableColumns(schema.disputes),
      introductionTitle: schema.introductionRequests.meetingTitle,
      contactName: schema.introductionRequests.contactName,
      againstUserName: sql<string>`concat(${againstUser.firstName}, ' ', ${againstUser.lastName})`,
      againstUserEmail: againstUser.email,
    })
    .from(schema.disputes)
    .leftJoin(
      schema.introductionRequests,
      eq(schema.disputes.introductionRequestId, schema.introductionRequests.id)
    )
    .leftJoin(againstUser, eq(schema.disputes.againstUserId, againstUser.id))
    .where(whereClause)
    .orderBy(buildDisputesOrderBy(sort, order));
}

/**
 * Get eligible introductions query
 * @param db - The database instance
 * @param userId - The user ID
 * @param query - The query DTO for search and pagination
 * @returns The query result with data and total count
 */
export async function getEligibleIntroductions(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  query: {
    search?: string;
    page?: number;
    limit?: number;
    isPagination?: boolean;
  }
) {
  const { page = 1, limit = 10, search, isPagination = true } = query;

  const disputedRequestIds = db
    .select({ id: schema.disputes.introductionRequestId })
    .from(schema.disputes)
    .where(inArray(schema.disputes.status, ACTIVE_DISPUTE_STATUSES));

  const baseConditions = [
    eq(schema.introductionRequests.requesterId, userId),
    inArray(
      schema.introductionRequests.status,
      ELIGIBLE_DISPUTE_INTRODUCTION_STATUSES
    ),
    eq(schema.introductionRequests.meetingCompletedByRequester, false),
    sql`${schema.introductionRequests.id} NOT IN (${disputedRequestIds})`,
  ];

  if (search) {
    baseConditions.push(
      or(
        ilike(schema.introductionRequests.meetingTitle, `%${search}%`),
        ilike(schema.introductionRequests.contactName, `%${search}%`)
      )!
    );
  }

  const whereClause = and(...baseConditions);

  const total = Number(
    (
      await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.introductionRequests)
        .where(whereClause)
    )[0]?.count || 0
  );

  const baseQuery = db
    .select({
      id: schema.introductionRequests.id,
      contactName: schema.introductionRequests.contactName,
      meetingTitle: schema.introductionRequests.meetingTitle,
      bountyAmount: schema.introductionRequests.bountyAmount,
      status: schema.introductionRequests.status,
      createdAt: schema.introductionRequests.createdAt,
      contactOwnerId: schema.introductionRequests.acceptedBy,
      requesterId: schema.introductionRequests.requesterId,
      meetingDuration: sql<null>`null`,
      paymentStatus: sql<null>`null`,
      userRole: sql<string>`'requester'`,
    })
    .from(schema.introductionRequests)
    .where(whereClause)
    .orderBy(desc(schema.introductionRequests.createdAt));

  const data = isPagination
    ? await baseQuery.limit(limit).offset((page - 1) * limit)
    : await baseQuery;

  return {
    data,
    total,
    page: isPagination ? page : 1,
    limit: isPagination ? limit : total,
    totalPages: isPagination ? Math.ceil(total / limit) : 1,
  };
}
