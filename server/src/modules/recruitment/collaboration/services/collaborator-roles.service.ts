import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { RECRUITING_COLLABORATION_MODULE } from "../recruitment-collaboration.constants";

@Injectable()
export class CollaboratorRolesService {
  private readonly logger = new Logger(CollaboratorRolesService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Roles assignable to collaborators on this job — i.e. roles that have a
   * permission row scoped to the `recruiting_collaboration` module. The generic
   * `roles` table holds unrelated roles too; the module join is what filters
   * them out. Owner-only.
   */
  async listCollaborationRoles(_ownerId: string, _jobId: string) {
    const rows = await this.db
      .select({
        id: schema.rolesSchema.id,
        name: schema.rolesSchema.name,
        permissions: schema.rolePermissionSchema.permissions,
      })
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
          eq(schema.rolesSchema.isActive, true),
          isNull(schema.rolesSchema.deletedAt)
        )
      )
      .orderBy(asc(schema.rolesSchema.name));

    // A role may have more than one module permission row — merge into a
    // single unique permission list per role, preserving first-seen order.
    const byRole = new Map<
      string,
      { id: string; name: string; permissions: string[]; seen: Set<string> }
    >();
    for (const row of rows) {
      let entry = byRole.get(row.id);
      if (!entry) {
        entry = {
          id: row.id,
          name: row.name,
          permissions: [],
          seen: new Set(),
        };
        byRole.set(row.id, entry);
      }
      for (const perm of row.permissions ?? []) {
        if (!entry.seen.has(perm)) {
          entry.seen.add(perm);
          entry.permissions.push(perm);
        }
      }
    }

    return {
      roles: [...byRole.values()].map(({ id, name, permissions }) => ({
        id,
        name,
        permissions,
      })),
    };
  }
}
