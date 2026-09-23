import { Injectable, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import {
  and,
  eq,
  ne,
  isNull,
  ilike,
  inArray,
  count,
  countDistinct,
} from "drizzle-orm";
import { parseClampPagination } from "utils/pagination.utils";
import { GetOrganisationsQueryDto } from "../recruitment-notifications.dto";
import { loadJobForNotification } from "../recruitment-notifications.utils";

@Injectable()
export class RecruitmentNotificationsQueryService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /** Searchable, paginated list of active organisations with active-member counts. */
  async getOrganisations(query: GetOrganisationsQueryDto) {
    const { newLimit } = parseClampPagination(
      query.limit ?? "20",
      undefined,
      20,
      100
    );
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const offset = (page - 1) * newLimit;

    const org = schema.organisation;
    const member = schema.organisationMemberSchema;
    const { users } = schema;

    const conditions = [eq(org.isActive, true), isNull(org.deletedAt)];
    if (query.search) {
      conditions.push(ilike(org.name, `%${query.search}%`));
    }
    const whereClause = and(...conditions);

    const [totalResult] = await this.db
      .select({ total: count() })
      .from(org)
      .where(whereClause);
    const total = totalResult?.total ?? 0;

    const organisations = await this.db
      .select({
        id: org.id,
        name: org.name,
        memberCount: countDistinct(users.id),
      })
      .from(org)
      .leftJoin(
        member,
        and(eq(member.organisationId, org.id), isNull(member.deletedAt))
      )
      .leftJoin(
        users,
        and(
          eq(users.id, member.userId),
          isNull(users.deletedAt),
          eq(users.isActive, true)
        )
      )
      .where(whereClause)
      .groupBy(org.id, org.name)
      .orderBy(org.name)
      .limit(newLimit)
      .offset(offset);

    const totalPages = Math.ceil(total / newLimit);
    return {
      organisations,
      pagination: {
        page,
        limit: newLimit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Distinct count of users who would receive the notification:
   * active, non-deleted members of the given organisations, excluding the
   * job poster. Cross-org duplicates are collapsed by DISTINCT.
   */
  async getRecipientCount(
    organisationIds: string[],
    excludeUserId: string
  ): Promise<number> {
    if (organisationIds.length === 0) return 0;
    const member = schema.organisationMemberSchema;
    const { users } = schema;
    const [result] = await this.db
      .select({ total: countDistinct(member.userId) })
      .from(member)
      .innerJoin(users, eq(users.id, member.userId))
      .where(
        and(
          inArray(member.organisationId, organisationIds),
          isNull(member.deletedAt),
          isNull(users.deletedAt),
          eq(users.isActive, true),
          ne(member.userId, excludeUserId)
        )
      );
    return Number(result?.total ?? 0);
  }

  /** Recipient-count preview for the confirm modal. Validates ownership + status. */
  async getNotifyPreview(
    userId: string,
    jobId: string,
    organisationIds: string[]
  ) {
    await loadJobForNotification(this.db, userId, jobId);
    const recipientCount = await this.getRecipientCount(
      organisationIds,
      userId
    );
    return { jobId, recipientCount };
  }
}
