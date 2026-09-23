import * as schema from "database/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  COLLABORATOR_STATUS,
  RECRUITING_COLLABORATION_MODULE,
  RECRUITMENT_PERMISSIONS,
} from "modules/recruitment/collaboration/recruitment-collaboration.constants";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PriorityActionItem } from "../recruiter-dashboard.response";
import { DRAFT_PRIORITY_ACTION } from "../dashboard-priority-actions.config";

/** User must hold at least one permission in the list to see the action. */
export const PRIORITY_ACTION_REQUIRED_PERMISSIONS: Record<
  PriorityActionItem["type"],
  readonly string[]
> = {
  new_applications: [
    RECRUITMENT_PERMISSIONS.CANDIDATE_SHORTLIST,
    RECRUITMENT_PERMISSIONS.CANDIDATE_REJECT,
  ],
  interview_feedback: [
    RECRUITMENT_PERMISSIONS.CANDIDATE_HIRE,
    RECRUITMENT_PERMISSIONS.CANDIDATE_REJECT,
  ],
  shortlisted_pending: [RECRUITMENT_PERMISSIONS.CANDIDATE_INTERVIEW_INVITE],
  interview_invite_pending: [
    RECRUITMENT_PERMISSIONS.CANDIDATE_INTERVIEW_INVITE,
  ],
  interview_scheduled: [RECRUITMENT_PERMISSIONS.CANDIDATE_VIEW],
  draft_ready: [RECRUITMENT_PERMISSIONS.JOB_EDIT],
};

type JobAccess = "owner" | Set<string>;

export function canShowPriorityActionForJob(
  type: PriorityActionItem["type"],
  access: JobAccess | undefined
): boolean {
  if (!access) return false;
  if (access === "owner") return true;
  const required = PRIORITY_ACTION_REQUIRED_PERMISSIONS[type];
  return required.some((permission) => access.has(permission));
}

export async function buildJobPermissionAccessMap(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  jobIds: string[]
): Promise<Map<string, JobAccess>> {
  const accessByJob = new Map<string, JobAccess>();
  if (jobIds.length === 0) return accessByJob;

  const uniqueJobIds = [...new Set(jobIds)];
  const jobRows = await db
    .select({
      id: schema.recruitmentJobsSchema.id,
      requesterId: schema.recruitmentJobsSchema.requesterId,
    })
    .from(schema.recruitmentJobsSchema)
    .where(
      and(
        inArray(schema.recruitmentJobsSchema.id, uniqueJobIds),
        isNull(schema.recruitmentJobsSchema.deletedAt)
      )
    );

  const collaboratorJobIds: string[] = [];
  for (const job of jobRows) {
    if (job.requesterId === userId) {
      accessByJob.set(job.id, "owner");
    } else {
      collaboratorJobIds.push(job.id);
    }
  }

  if (collaboratorJobIds.length === 0) return accessByJob;

  const collaboratorRows = await db
    .select({
      jobId: schema.recruitmentJobCollaborators.jobId,
      roleId: schema.recruitmentJobCollaborators.roleId,
    })
    .from(schema.recruitmentJobCollaborators)
    .where(
      and(
        eq(schema.recruitmentJobCollaborators.collaboratorUserId, userId),
        inArray(schema.recruitmentJobCollaborators.jobId, collaboratorJobIds),
        eq(
          schema.recruitmentJobCollaborators.status,
          COLLABORATOR_STATUS.ACTIVE
        ),
        isNull(schema.recruitmentJobCollaborators.deletedAt)
      )
    );

  const roleIds = [...new Set(collaboratorRows.map((row) => row.roleId))];
  const permissionsByRole = await loadCollaborationRolePermissions(db, roleIds);

  for (const row of collaboratorRows) {
    accessByJob.set(row.jobId, permissionsByRole.get(row.roleId) ?? new Set());
  }

  return accessByJob;
}

async function loadCollaborationRolePermissions(
  db: PostgresJsDatabase<typeof schema>,
  roleIds: string[]
): Promise<Map<string, Set<string>>> {
  const permissionsByRole = new Map<string, Set<string>>();
  if (roleIds.length === 0) return permissionsByRole;

  const rows = await db
    .select({
      roleId: schema.rolePermissionSchema.roleId,
      permissions: schema.rolePermissionSchema.permissions,
    })
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
        inArray(schema.rolePermissionSchema.roleId, roleIds),
        eq(schema.rolePermissionSchema.module, RECRUITING_COLLABORATION_MODULE),
        isNull(schema.rolePermissionSchema.deletedAt)
      )
    );

  for (const row of rows) {
    let perms = permissionsByRole.get(row.roleId);
    if (!perms) {
      perms = new Set<string>();
      permissionsByRole.set(row.roleId, perms);
    }
    for (const permission of row.permissions ?? []) {
      perms.add(permission);
    }
  }

  return permissionsByRole;
}

export type PriorityActionCandidate = {
  jobId: string;
  jobTitle: string;
  type: PriorityActionItem["type"];
  count: number;
  message: string;
  priority: number;
};

export function filterPriorityActionsByJobPermissions(
  actions: PriorityActionCandidate[],
  accessByJob: Map<string, JobAccess>
): PriorityActionCandidate[] {
  return actions.filter((action) =>
    canShowPriorityActionForJob(action.type, accessByJob.get(action.jobId))
  );
}

export function countWaitingPriorityActions(
  actions: PriorityActionCandidate[]
): number {
  return actions
    .filter((action) => action.type !== DRAFT_PRIORITY_ACTION.type)
    .reduce((sum, action) => sum + action.count, 0);
}
