import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, count, eq, ilike, isNull, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { parseClampPagination } from "utils/pagination.utils";
import { Transaction } from "./completion.types";
import {
  ORGANIZATION_LIST_DEFAULT_LIMIT,
  ORGANIZATION_LIST_MAX_LIMIT,
  PROFILE_COMPLETION_MESSAGES,
} from "./profile-completion.constants";
import { GetCompletionOrganizationsQueryDto } from "./profile-completion.dto";
import { CurrentOrganization } from "./profile-completion.response";

/**
 * Organisation reads and guard checks for the completion gate.
 *
 * Unlike `GET /recruitment/organisations`, this lists inactive organisations
 * too: a user picking their employer needs to see one another user created but
 * an admin has not approved yet.
 */
@Injectable()
export class OrganizationLookupService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async search(query: GetCompletionOrganizationsQueryDto) {
    const { newLimit } = parseClampPagination(
      query.limit,
      undefined,
      ORGANIZATION_LIST_DEFAULT_LIMIT,
      ORGANIZATION_LIST_MAX_LIMIT
    );
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);

    const org = schema.organisation;
    const conditions = [isNull(org.deletedAt)];

    if (query.search) {
      conditions.push(ilike(org.name, `%${query.search}%`));
    }

    const where = and(...conditions);

    const [totalResult] = await this.db
      .select({ total: count() })
      .from(org)
      .where(where);
    const total = totalResult?.total ?? 0;

    const offset = (page - 1) * newLimit;

    // An out-of-range page would otherwise make Postgres sort the whole table
    // just to discard every row, so answer it without touching the table.
    const organizations =
      offset >= total
        ? []
        : await this.db
            .select({ id: org.id, name: org.name, isActive: org.isActive })
            .from(org)
            .where(where)
            .orderBy(org.name)
            .limit(newLimit)
            .offset(offset);

    const totalPages = Math.ceil(total / newLimit);

    return {
      organizations,
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

  async findCurrentMembership(
    userId: string
  ): Promise<CurrentOrganization | null> {
    const member = schema.organisationMemberSchema;
    const org = schema.organisation;

    const [row] = await this.db
      .select({
        id: org.id,
        name: org.name,
        isActive: org.isActive,
        isVerified: member.isVerified,
      })
      .from(member)
      .innerJoin(org, eq(org.id, member.organisationId))
      .where(
        and(
          eq(member.userId, userId),
          isNull(member.deletedAt),
          isNull(org.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async hasMembership(userId: string): Promise<boolean> {
    const member = schema.organisationMemberSchema;
    const org = schema.organisation;

    const [row] = await this.db
      .select({ id: member.id })
      .from(member)
      .innerJoin(org, eq(org.id, member.organisationId))
      .where(
        and(
          eq(member.userId, userId),
          isNull(member.deletedAt),
          isNull(org.deletedAt)
        )
      )
      .limit(1);

    return !!row;
  }

  async assertNameAvailable(tx: Transaction, name: string) {
    const org = schema.organisation;

    const [existing] = await tx
      .select({ id: org.id })
      .from(org)
      .where(
        and(sql`lower(${org.name}) = lower(${name})`, isNull(org.deletedAt))
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(
        PROFILE_COMPLETION_MESSAGES.ERROR.ORGANIZATION_NAME_TAKEN
      );
    }
  }

  /**
   * Caps each user at one self-created organisation. Soft-deleted rows still
   * count, so deleting one is not a way around the limit.
   */
  async assertCreateAllowed(tx: Transaction, userId: string) {
    const org = schema.organisation;

    const [existing] = await tx
      .select({ id: org.id })
      .from(org)
      .where(eq(org.createdBy, userId))
      .limit(1);

    if (existing) {
      throw new ForbiddenException(
        PROFILE_COMPLETION_MESSAGES.ERROR.ORGANIZATION_LIMIT_REACHED
      );
    }
  }

  async assertOrganizationExists(tx: Transaction, organizationId: string) {
    const org = schema.organisation;

    const [existing] = await tx
      .select({ id: org.id })
      .from(org)
      .where(and(eq(org.id, organizationId), isNull(org.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(
        PROFILE_COMPLETION_MESSAGES.ERROR.ORGANIZATION_NOT_FOUND
      );
    }
  }
}
