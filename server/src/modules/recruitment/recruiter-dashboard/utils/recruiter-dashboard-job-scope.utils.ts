import { alias } from "drizzle-orm/pg-core";
import * as schema from "database/schema";
import { and, eq, isNull, or, inArray, sql, type SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { countriesJsonbOverlapCondition } from "../../recruitment-country-filter.utils";
import {
  COLLABORATOR_STATUS,
  RECRUITING_COLLABORATION_MODULE,
} from "../../collaboration/recruitment-collaboration.constants";

/**
 * Jobs a user collaborates on: active collaborator, shared verified organisation,
 * organisation still active.
 *
 * `requiredPermission` is optional and defaults to undefined, which preserves the
 * dashboard's existing behaviour exactly — status alone. Callers that expose
 * candidate data must pass one: candidate search reads résumés and contact
 * details, so an active collaborator whose role lacks `candidate.view` must not
 * reach it (ADR-005 §3).
 *
 * Extended here rather than composed at the call site so there is one
 * implementation of the collaborator join, not two that can drift.
 */
export function createCollaboratorJobIdsSubquery(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  requiredPermission?: string
) {
  const permissionJoin = requiredPermission
    ? [
        eq(
          schema.rolePermissionSchema.roleId,
          schema.recruitmentJobCollaborators.roleId
        ),
        eq(schema.rolePermissionSchema.module, RECRUITING_COLLABORATION_MODULE),
        isNull(schema.rolePermissionSchema.deletedAt),
        sql`${requiredPermission} = ANY(${schema.rolePermissionSchema.permissions})`,
      ]
    : null;

  const meOrg = alias(schema.organisationMemberSchema, "dash_me_org");
  const ownerOrg = alias(schema.organisationMemberSchema, "dash_owner_org");

  const base = db
    .selectDistinct({ jobId: schema.recruitmentJobCollaborators.jobId })
    .from(schema.recruitmentJobCollaborators)
    .innerJoin(
      schema.recruitmentJobsSchema,
      eq(
        schema.recruitmentJobsSchema.id,
        schema.recruitmentJobCollaborators.jobId
      )
    )
    .innerJoin(
      meOrg,
      and(
        eq(meOrg.userId, userId),
        eq(meOrg.isVerified, true),
        isNull(meOrg.deletedAt)
      )
    )
    .innerJoin(
      ownerOrg,
      and(
        eq(ownerOrg.userId, schema.recruitmentJobsSchema.requesterId),
        eq(ownerOrg.organisationId, meOrg.organisationId),
        eq(ownerOrg.isVerified, true),
        isNull(ownerOrg.deletedAt)
      )
    )
    .innerJoin(
      schema.organisation,
      and(
        eq(schema.organisation.id, meOrg.organisationId),
        eq(schema.organisation.isActive, true),
        isNull(schema.organisation.deletedAt)
      )
    )
    .where(
      and(
        eq(schema.recruitmentJobCollaborators.collaboratorUserId, userId),
        eq(
          schema.recruitmentJobCollaborators.status,
          COLLABORATOR_STATUS.ACTIVE
        ),
        isNull(schema.recruitmentJobCollaborators.deletedAt)
      )
    );

  if (!permissionJoin) return base;

  // An inner join on an active role holding the permission: a collaborator whose
  // role was edited to drop it stops matching immediately, with no cache to
  // invalidate (ADR-004 revocation).
  return base.innerJoin(
    schema.rolePermissionSchema,
    and(...permissionJoin)
  ) as unknown as typeof base;
}

export function buildAccessibleJobsCondition(
  userId: string,
  jobTable: typeof schema.recruitmentJobsSchema,
  collaboratorSubquery: ReturnType<typeof createCollaboratorJobIdsSubquery>,
  countries: string[]
): SQL {
  const conditions: SQL[] = [
    or(
      eq(jobTable.requesterId, userId),
      inArray(jobTable.id, collaboratorSubquery)
    )!,
    isNull(jobTable.deletedAt),
  ];
  const countryFilter = countriesJsonbOverlapCondition(
    jobTable.countries,
    countries
  );
  if (countryFilter) conditions.push(countryFilter);
  return and(...conditions)!;
}
