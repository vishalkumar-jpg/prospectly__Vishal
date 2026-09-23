import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  COLLABORATOR_STATUS,
  RECRUITING_COLLABORATION_MODULE,
  RECRUITMENT_COLLABORATION_MESSAGES,
  RECRUITMENT_PERMISSIONS,
  RecruitmentPermission,
} from "../recruitment-collaboration.constants";

export type RecruitmentAccessRole = "owner" | "collaborator";

export interface ResolvedJobAccess {
  role: RecruitmentAccessRole;
  permissions: Set<string>;
  job: {
    id: string;
    requesterId: string;
    status: string;
  };
}

/** Every permission a job owner implicitly holds. */
const ALL_PERMISSIONS = new Set<string>(Object.values(RECRUITMENT_PERMISSIONS));

/**
 * Single authorization resolver for the recruitment module.
 *
 * Answers "can user U act on job J?" uniformly so individual services never
 * hand-roll ownership checks. The owner (recruitment_jobs.requesterId) is an
 * implicit superuser; a collaborator holds exactly the permissions on their
 * admin-assigned role, and only while they remain a verified member of an
 * organisation shared with the owner (revocation is enforced per-request).
 */
@Injectable()
export class RecruitmentAccessService {
  private readonly logger = new Logger(RecruitmentAccessService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Resolve the caller's access to a job. Throws NotFound if the job is missing,
   * Forbidden if the caller is neither owner nor an eligible active collaborator.
   */
  async resolveJobAccess(
    userId: string,
    jobId: string
  ): Promise<ResolvedJobAccess> {
    const [job] = await this.db
      .select({
        id: schema.recruitmentJobsSchema.id,
        requesterId: schema.recruitmentJobsSchema.requesterId,
        status: schema.recruitmentJobsSchema.status,
      })
      .from(schema.recruitmentJobsSchema)
      .where(
        and(
          eq(schema.recruitmentJobsSchema.id, jobId),
          isNull(schema.recruitmentJobsSchema.deletedAt)
        )
      )
      .limit(1);

    if (!job) {
      throw new NotFoundException(
        RECRUITMENT_COLLABORATION_MESSAGES.ERROR.JOB_NOT_FOUND
      );
    }

    // Owner = implicit all-permissions (can never lock themselves out).
    if (job.requesterId === userId) {
      return { role: "owner", permissions: new Set(ALL_PERMISSIONS), job };
    }

    // Otherwise the caller must be an active collaborator on this job.
    const [collaborator] = await this.db
      .select({
        id: schema.recruitmentJobCollaborators.id,
        roleId: schema.recruitmentJobCollaborators.roleId,
      })
      .from(schema.recruitmentJobCollaborators)
      .where(
        and(
          eq(schema.recruitmentJobCollaborators.jobId, jobId),
          eq(schema.recruitmentJobCollaborators.collaboratorUserId, userId),
          eq(
            schema.recruitmentJobCollaborators.status,
            COLLABORATOR_STATUS.ACTIVE
          ),
          isNull(schema.recruitmentJobCollaborators.deletedAt)
        )
      )
      .limit(1);

    if (!collaborator) {
      throw new ForbiddenException(
        RECRUITMENT_COLLABORATION_MESSAGES.ERROR.FORBIDDEN
      );
    }

    // SECURITY: re-verify org membership every request so a collaborator who
    // leaves the owner's organisation loses access immediately, before removal.
    const sharesOrg = await this.usersShareVerifiedOrg(job.requesterId, userId);
    if (!sharesOrg) {
      throw new ForbiddenException(
        RECRUITMENT_COLLABORATION_MESSAGES.ERROR.FORBIDDEN
      );
    }

    // Fail closed: a collaborator whose role is inactive/deleted (or has no
    // collaboration-module permission row) has no valid role — deny access.
    const permissions = await this.loadRolePermissions(collaborator.roleId);
    if (!permissions) {
      throw new ForbiddenException(
        RECRUITMENT_COLLABORATION_MESSAGES.ERROR.FORBIDDEN
      );
    }
    return { role: "collaborator", permissions, job };
  }

  /** Resolve access and throw Forbidden unless the caller holds `permission`. */
  async assertPermission(
    userId: string,
    jobId: string,
    permission: RecruitmentPermission
  ): Promise<ResolvedJobAccess> {
    const access = await this.resolveJobAccess(userId, jobId);
    if (!access.permissions.has(permission)) {
      throw new ForbiddenException(
        RECRUITMENT_COLLABORATION_MESSAGES.ERROR.FORBIDDEN
      );
    }
    return access;
  }

  /**
   * Assert a permission for an action targeting a candidate. Resolves the
   * candidate's job, throwing NotFound if the candidate is missing.
   */
  async assertCandidatePermission(
    userId: string,
    candidateId: string,
    permission: RecruitmentPermission
  ): Promise<ResolvedJobAccess> {
    const [candidate] = await this.db
      .select({ jobId: schema.recruitmentJobCandidates.jobId })
      .from(schema.recruitmentJobCandidates)
      .where(
        and(
          eq(schema.recruitmentJobCandidates.id, candidateId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);

    if (!candidate) {
      throw new NotFoundException(
        RECRUITMENT_COLLABORATION_MESSAGES.ERROR.CANDIDATE_NOT_FOUND
      );
    }

    return this.assertPermission(userId, candidate.jobId, permission);
  }

  /**
   * Load the permission strings granted to a collaboration role. Returns null
   * when there is NO active collaboration-module role for this id (deactivated /
   * deleted / wrong module) so callers can fail closed; an existing role with an
   * empty permission list returns an empty Set (valid, but can do nothing).
   */
  private async loadRolePermissions(
    roleId: string
  ): Promise<Set<string> | null> {
    const rows = await this.db
      .select({ permissions: schema.rolePermissionSchema.permissions })
      .from(schema.rolePermissionSchema)
      .innerJoin(
        schema.rolesSchema,
        and(
          eq(schema.rolesSchema.id, schema.rolePermissionSchema.roleId),
          eq(schema.rolesSchema.isActive, true),
          isNull(schema.rolesSchema.deletedAt)
        )
      )
      .where(
        and(
          eq(schema.rolePermissionSchema.roleId, roleId),
          eq(
            schema.rolePermissionSchema.module,
            RECRUITING_COLLABORATION_MODULE
          ),
          isNull(schema.rolePermissionSchema.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const permissions = new Set<string>();
    for (const row of rows) {
      for (const perm of row.permissions ?? []) permissions.add(perm);
    }
    return permissions;
  }

  /**
   * True if both users are currently verified members of at least one common,
   * active organisation. This is the cross-org isolation guarantee.
   */
  async usersShareVerifiedOrg(
    ownerId: string,
    collaboratorId: string
  ): Promise<boolean> {
    const ownerMember = schema.organisationMemberSchema;
    const collaboratorMember = alias(
      schema.organisationMemberSchema,
      "collaborator_member"
    );

    const [row] = await this.db
      .select({ organisationId: ownerMember.organisationId })
      .from(ownerMember)
      .innerJoin(
        collaboratorMember,
        and(
          eq(collaboratorMember.organisationId, ownerMember.organisationId),
          eq(collaboratorMember.userId, collaboratorId),
          eq(collaboratorMember.isVerified, true),
          isNull(collaboratorMember.deletedAt)
        )
      )
      .innerJoin(
        schema.organisation,
        and(
          eq(schema.organisation.id, ownerMember.organisationId),
          eq(schema.organisation.isActive, true),
          isNull(schema.organisation.deletedAt)
        )
      )
      .where(
        and(
          eq(ownerMember.userId, ownerId),
          eq(ownerMember.isVerified, true),
          isNull(ownerMember.deletedAt)
        )
      )
      .limit(1);

    return Boolean(row);
  }

  /**
   * Of the given user ids, return the subset that currently share a verified,
   * active organisation with the owner. One query — the bulk counterpart of
   * usersShareVerifiedOrg (avoids N membership checks when adding many at once).
   */
  async filterUsersSharingVerifiedOrg(
    ownerId: string,
    userIds: string[]
  ): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();

    const ownerMember = schema.organisationMemberSchema;
    const collaboratorMember = alias(
      schema.organisationMemberSchema,
      "collaborator_member"
    );

    const rows = await this.db
      .selectDistinct({ userId: collaboratorMember.userId })
      .from(ownerMember)
      .innerJoin(
        collaboratorMember,
        and(
          eq(collaboratorMember.organisationId, ownerMember.organisationId),
          inArray(collaboratorMember.userId, userIds),
          eq(collaboratorMember.isVerified, true),
          isNull(collaboratorMember.deletedAt)
        )
      )
      .innerJoin(
        schema.organisation,
        and(
          eq(schema.organisation.id, ownerMember.organisationId),
          eq(schema.organisation.isActive, true),
          isNull(schema.organisation.deletedAt)
        )
      )
      .where(
        and(
          eq(ownerMember.userId, ownerId),
          eq(ownerMember.isVerified, true),
          isNull(ownerMember.deletedAt)
        )
      );

    return new Set(rows.map((r) => r.userId));
  }
}
