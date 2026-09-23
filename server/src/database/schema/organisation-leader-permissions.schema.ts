import {
  uuid,
  integer,
  timestamp,
  text,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { organisation } from "./organisation.schema";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const organisationLeaderPermissions = prospectlySchema.table(
  "organisation_leader_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .references(() => organisation.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    allowedPlanIds: jsonb("allowed_plan_ids")
      .$type<string[]>()
      .default([])
      .notNull(),
    maxInvitesPerMonth: integer("max_invites_per_month"),
    invitesUsedThisMonth: integer("invites_used_this_month")
      .default(0)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    orgUserIdx: index("idx_org_leader_perms_org_user").on(
      table.organisationId,
      table.userId
    ),
    userIdIdx: index("idx_org_leader_perms_user").on(table.userId),
    allowedPlanIdsIdx: index("idx_org_leader_perms_allowed_plans").using(
      "gin",
      table.allowedPlanIds
    ),
  })
);
