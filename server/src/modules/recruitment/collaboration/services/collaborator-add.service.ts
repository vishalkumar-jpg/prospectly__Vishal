import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import {
  RecruitmentAccessService,
  ResolvedJobAccess,
} from "./recruitment-access.service";
import { RecruitmentCollaborationNotifierService } from "./recruitment-collaboration-notifier.service";
import {
  CANDIDATE_MANAGER_ROLE_NAME,
  COLLABORATOR_SKIP_REASON,
  COLLABORATOR_STATUS,
  RECRUITING_COLLABORATION_MODULE,
  RECRUITMENT_COLLABORATION_MESSAGES,
} from "../recruitment-collaboration.constants";
import { BulkAddCollaboratorsDto } from "../recruitment-collaboration.dto";

interface SkippedUser {
  userId: string;
  reason: string;
}

@Injectable()
export class CollaboratorAddService {
  private readonly logger = new Logger(CollaboratorAddService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly accessService: RecruitmentAccessService,
    private readonly notifier: RecruitmentCollaborationNotifierService
  ) {}

  /**
   * Add many collaborators in one pass. Owner-only. Each id is independently
   * validated; ineligible ids are reported in `skipped` rather than failing the
   * whole request. No N+1: one org-membership query + one existing-rows query.
   */
  async addCollaboratorsBulk(
    ownerId: string,
    access: ResolvedJobAccess,
    dto: BulkAddCollaboratorsDto
  ): Promise<{ added: number; skipped: SkippedUser[] }> {
    // Authorization (collaborator.manage) was enforced by the guard; the
    // resolved job is passed in.
    const jobId = access.job.id;
    const roleId = await this.resolveRoleId(dto.roleId);

    const skipped: SkippedUser[] = [];

    // Dedupe input; the owner can never be a collaborator.
    const uniqueIds = [...new Set(dto.userIds)];
    const candidateIds: string[] = [];
    for (const id of uniqueIds) {
      if (id === access.job.requesterId) {
        skipped.push({ userId: id, reason: COLLABORATOR_SKIP_REASON.IS_OWNER });
      } else {
        candidateIds.push(id);
      }
    }
    if (candidateIds.length === 0) return { added: 0, skipped };

    // Cross-org isolation — scoped to the JOB OWNER's orgs (not the actor's, who
    // may be a managing collaborator). One query for the whole batch.
    const sharing = await this.accessService.filterUsersSharingVerifiedOrg(
      access.job.requesterId,
      candidateIds
    );
    const orgEligible: string[] = [];
    for (const id of candidateIds) {
      if (sharing.has(id)) {
        orgEligible.push(id);
      } else {
        skipped.push({
          userId: id,
          reason: COLLABORATOR_SKIP_REASON.NOT_ORG_MEMBER,
        });
      }
    }
    if (orgEligible.length === 0) return { added: 0, skipped };

    // Existing rows for these users on this job — latest per user (any state).
    const existingRows = await this.db
      .select({
        id: schema.recruitmentJobCollaborators.id,
        collaboratorUserId:
          schema.recruitmentJobCollaborators.collaboratorUserId,
        deletedAt: schema.recruitmentJobCollaborators.deletedAt,
      })
      .from(schema.recruitmentJobCollaborators)
      .where(
        and(
          eq(schema.recruitmentJobCollaborators.jobId, jobId),
          inArray(
            schema.recruitmentJobCollaborators.collaboratorUserId,
            orgEligible
          )
        )
      )
      .orderBy(desc(schema.recruitmentJobCollaborators.createdAt));

    const latestByUser = new Map<
      string,
      { id: string; deletedAt: Date | null }
    >();
    for (const row of existingRows) {
      if (!latestByUser.has(row.collaboratorUserId)) {
        latestByUser.set(row.collaboratorUserId, {
          id: row.id,
          deletedAt: row.deletedAt,
        });
      }
    }

    const toInsert: string[] = [];
    const toReactivate: string[] = [];
    const addedUserIds: string[] = [];
    for (const id of orgEligible) {
      const latest = latestByUser.get(id);
      if (latest && !latest.deletedAt) {
        skipped.push({
          userId: id,
          reason: COLLABORATOR_SKIP_REASON.ALREADY_COLLABORATOR,
        });
      } else if (latest) {
        toReactivate.push(latest.id);
        addedUserIds.push(id);
      } else {
        toInsert.push(id);
        addedUserIds.push(id);
      }
    }
    if (addedUserIds.length === 0) return { added: 0, skipped };

    const now = toUTC();
    await this.db.transaction(async (tx) => {
      if (toReactivate.length > 0) {
        await tx
          .update(schema.recruitmentJobCollaborators)
          .set({
            roleId,
            status: COLLABORATOR_STATUS.ACTIVE,
            invitedBy: ownerId,
            notifiedAt: null,
            deletedAt: null,
            updatedAt: now,
            updatedBy: ownerId,
          })
          .where(inArray(schema.recruitmentJobCollaborators.id, toReactivate));
      }
      if (toInsert.length > 0) {
        await tx.insert(schema.recruitmentJobCollaborators).values(
          toInsert.map((userId) => ({
            jobId,
            collaboratorUserId: userId,
            roleId,
            status: COLLABORATOR_STATUS.ACTIVE,
            invitedBy: ownerId,
            createdBy: ownerId,
            updatedBy: ownerId,
          }))
        );
      }
    });

    // Opt-in emails: enqueue (off the request path). The worker sends each one
    // and stamps notifiedAt on success. Enqueues are fast and best-effort.
    if (dto.notify) {
      for (const userId of addedUserIds) {
        await this.notifier.enqueueCollaboratorAddedEmail({
          collaboratorUserId: userId,
          ownerId,
          jobId,
        });
      }
    }

    return { added: addedUserIds.length, skipped };
  }

  /** Resolve the role to assign — provided roleId or the seeded default. */
  private async resolveRoleId(requestedRoleId?: string): Promise<string> {
    if (requestedRoleId) {
      // Only accept roles scoped to the collaboration module — otherwise a
      // direct API call could attach an unrelated active role that the roles
      // endpoint never returns and that resolves to no collaboration permissions.
      const [role] = await this.db
        .select({ id: schema.rolesSchema.id })
        .from(schema.rolesSchema)
        .innerJoin(
          schema.rolePermissionSchema,
          and(
            eq(schema.rolePermissionSchema.roleId, schema.rolesSchema.id),
            eq(
              schema.rolePermissionSchema.module,
              RECRUITING_COLLABORATION_MODULE
            ),
            isNull(schema.rolePermissionSchema.deletedAt)
          )
        )
        .where(
          and(
            eq(schema.rolesSchema.id, requestedRoleId),
            eq(schema.rolesSchema.isActive, true),
            isNull(schema.rolesSchema.deletedAt)
          )
        )
        .limit(1);
      if (!role) {
        throw new BadRequestException(
          RECRUITMENT_COLLABORATION_MESSAGES.ERROR.ROLE_NOT_FOUND
        );
      }
      return role.id;
    }

    // Default: the seeded candidate_manager role for this module.
    const [defaultRole] = await this.db
      .select({ id: schema.rolesSchema.id })
      .from(schema.rolesSchema)
      .innerJoin(
        schema.rolePermissionSchema,
        and(
          eq(schema.rolePermissionSchema.roleId, schema.rolesSchema.id),
          eq(
            schema.rolePermissionSchema.module,
            RECRUITING_COLLABORATION_MODULE
          ),
          isNull(schema.rolePermissionSchema.deletedAt)
        )
      )
      .where(
        and(
          eq(schema.rolesSchema.name, CANDIDATE_MANAGER_ROLE_NAME),
          eq(schema.rolesSchema.isActive, true),
          isNull(schema.rolesSchema.deletedAt)
        )
      )
      .limit(1);

    if (!defaultRole) {
      throw new BadRequestException(
        RECRUITMENT_COLLABORATION_MESSAGES.ERROR.ROLE_NOT_FOUND
      );
    }
    return defaultRole.id;
  }
}
