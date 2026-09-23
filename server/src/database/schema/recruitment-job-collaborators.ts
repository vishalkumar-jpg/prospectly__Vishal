import {
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { rolesSchema } from "./role.schema";
import { recruitmentJobsSchema } from "./recruitment-jobs";

// Co-workers a job owner adds to help manage a job's candidate pipeline.
// The owner (recruitment_jobs.requesterId) is NOT represented here — ownership
// stays implicit on the job. A collaborator's capabilities are decided entirely
// by the admin-managed role referenced by roleId (roles + role_permission),
// resolved per-request by RecruitmentAccessService. Owner-only invariants
// (edit job, manage collaborators) are simply permissions the v1 role omits.
//
// Insert-only + soft-delete: removing a collaborator soft-deletes the row and
// flips status to 'removed'; re-adding reactivates rather than duplicating
// (enforced by the partial unique index).
export const recruitmentJobCollaborators = prospectlySchema.table(
  "recruitment_job_collaborators",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: uuid("job_id")
      .notNull()
      .references(() => recruitmentJobsSchema.id, { onDelete: "cascade" }),
    collaboratorUserId: uuid("collaborator_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Admin-managed role (module 'recruiting_collaboration'). v1 defaults to the
    // seeded 'candidate_manager' role; accepting it future-proofs per-stage roles.
    roleId: uuid("role_id")
      .notNull()
      .references(() => rolesSchema.id),
    // 'active' — currently has access; 'removed' — revoked by owner (also soft-deleted).
    status: varchar("status", { length: 20 }).notNull().default("active"),
    // Owner who added this collaborator.
    invitedBy: uuid("invited_by").references(() => users.id),
    // Set when the opt-in "collaborator added" email was enqueued.
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    jobCollaboratorUnique: uniqueIndex(
      "uq_recruitment_job_collaborators_job_user"
    )
      .on(table.jobId, table.collaboratorUserId)
      .where(sql`deleted_at IS NULL`),
    jobIdIdx: index("idx_recruitment_job_collaborators_job_id").on(table.jobId),
    collaboratorUserIdIdx: index(
      "idx_recruitment_job_collaborators_collaborator_user_id"
    ).on(table.collaboratorUserId),
  })
);

export type RecruitmentJobCollaborator =
  typeof recruitmentJobCollaborators.$inferSelect;
export type NewRecruitmentJobCollaborator =
  typeof recruitmentJobCollaborators.$inferInsert;
