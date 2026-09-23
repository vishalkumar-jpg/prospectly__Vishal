import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import {
  and,
  countDistinct,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  notInArray,
  or,
} from "drizzle-orm";
import { COLLABORATOR_STATUS } from "../recruitment-collaboration.constants";
import { ListEligibleMembersQueryDto } from "../recruitment-collaboration.dto";

@Injectable()
export class CollaboratorListService {
  private readonly logger = new Logger(CollaboratorListService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /** Roster of active collaborators on a job. Owner-only (collaborator.manage). */
  async getCollaborators(ownerId: string, jobId: string) {
    const collaborators = await this.db
      .select({
        id: schema.recruitmentJobCollaborators.id,
        userId: schema.recruitmentJobCollaborators.collaboratorUserId,
        roleId: schema.recruitmentJobCollaborators.roleId,
        roleName: schema.rolesSchema.name,
        status: schema.recruitmentJobCollaborators.status,
        invitedBy: schema.recruitmentJobCollaborators.invitedBy,
        notifiedAt: schema.recruitmentJobCollaborators.notifiedAt,
        createdAt: schema.recruitmentJobCollaborators.createdAt,
        fullName: schema.users.fullName,
        email: schema.users.email,
        profilePhotoUrl: schema.users.profilePhotoUrl,
      })
      .from(schema.recruitmentJobCollaborators)
      .innerJoin(
        schema.users,
        eq(
          schema.users.id,
          schema.recruitmentJobCollaborators.collaboratorUserId
        )
      )
      .leftJoin(
        schema.rolesSchema,
        eq(schema.rolesSchema.id, schema.recruitmentJobCollaborators.roleId)
      )
      .where(
        and(
          eq(schema.recruitmentJobCollaborators.jobId, jobId),
          eq(
            schema.recruitmentJobCollaborators.status,
            COLLABORATOR_STATUS.ACTIVE
          ),
          isNull(schema.recruitmentJobCollaborators.deletedAt)
        )
      )
      .orderBy(desc(schema.recruitmentJobCollaborators.createdAt));

    return { collaborators };
  }

  /**
   * Verified members of the owner's organisation(s) eligible to be added —
   * excludes the owner and anyone already an active collaborator. Owner-only.
   */
  async getEligibleMembers(
    ownerId: string,
    jobId: string,
    query: ListEligibleMembersQueryDto
  ) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;
    const search = query.search?.trim();

    // Owner's currently-verified organisations.
    const ownerOrgs = await this.db
      .selectDistinct({
        organisationId: schema.organisationMemberSchema.organisationId,
      })
      .from(schema.organisationMemberSchema)
      .innerJoin(
        schema.organisation,
        and(
          eq(
            schema.organisation.id,
            schema.organisationMemberSchema.organisationId
          ),
          eq(schema.organisation.isActive, true),
          isNull(schema.organisation.deletedAt)
        )
      )
      .where(
        and(
          eq(schema.organisationMemberSchema.userId, ownerId),
          eq(schema.organisationMemberSchema.isVerified, true),
          isNull(schema.organisationMemberSchema.deletedAt)
        )
      );

    const orgIds = ownerOrgs.map((o) => o.organisationId);
    if (orgIds.length === 0) {
      return this.emptyMembersResult(page, limit);
    }

    // Users already collaborating (active) on this job — excluded from results.
    const existing = await this.db
      .select({
        userId: schema.recruitmentJobCollaborators.collaboratorUserId,
      })
      .from(schema.recruitmentJobCollaborators)
      .where(
        and(
          eq(schema.recruitmentJobCollaborators.jobId, jobId),
          eq(
            schema.recruitmentJobCollaborators.status,
            COLLABORATOR_STATUS.ACTIVE
          ),
          isNull(schema.recruitmentJobCollaborators.deletedAt)
        )
      );
    const excludedUserIds = [ownerId, ...existing.map((e) => e.userId)];

    const conditions = [
      inArray(schema.organisationMemberSchema.organisationId, orgIds),
      eq(schema.organisationMemberSchema.isVerified, true),
      isNull(schema.organisationMemberSchema.deletedAt),
      isNull(schema.users.deletedAt),
      notInArray(schema.users.id, excludedUserIds),
    ];

    if (search) {
      conditions.push(
        or(
          ilike(schema.users.fullName, `%${search}%`),
          ilike(schema.users.email, `%${search}%`)
        )!
      );
    }

    const whereClause = and(...conditions);

    const [members, [totalRow]] = await Promise.all([
      this.db
        .selectDistinct({
          id: schema.users.id,
          fullName: schema.users.fullName,
          email: schema.users.email,
          profilePhotoUrl: schema.users.profilePhotoUrl,
          jobTitle: schema.users.jobTitle,
        })
        .from(schema.organisationMemberSchema)
        .innerJoin(
          schema.users,
          eq(schema.users.id, schema.organisationMemberSchema.userId)
        )
        .where(whereClause)
        .orderBy(schema.users.fullName)
        .limit(limit)
        .offset(offset),
      this.db
        .select({
          total: countDistinct(schema.users.id),
        })
        .from(schema.organisationMemberSchema)
        .innerJoin(
          schema.users,
          eq(schema.users.id, schema.organisationMemberSchema.userId)
        )
        .where(whereClause),
    ]);

    const total = totalRow?.total ?? 0;
    return {
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private emptyMembersResult(page: number, limit: number) {
    return {
      members: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }
}
