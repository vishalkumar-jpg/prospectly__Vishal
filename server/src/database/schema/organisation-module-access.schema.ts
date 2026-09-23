import { uuid, timestamp, text, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organisation } from "./organisation.schema";
import { prospectlySchema } from "./schema-definition";
import { userModuleEnum } from "./enums";

/**
 * Per-module feature flags for an organisation, stored on the org's module row.
 * Extend this shape as new org-level toggles are introduced.
 */
export type OrganisationModuleConfig = {
  earlyCandidateDetailsAccess?: boolean;
  internalConnectorPayoutWaitDays?: number;
};

export const organisationModuleAccess = prospectlySchema.table(
  "organisation_module_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisation.id, { onDelete: "cascade" }),
    module: userModuleEnum("module").notNull(),
    config: jsonb("config")
      .$type<OrganisationModuleConfig>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    uniqueOrgModule: uniqueIndex("org_module_unique")
      .on(table.organisationId, table.module)
      .where(sql`${table.deletedAt} IS NULL`),
  })
);

export type OrganisationModuleAccess =
  typeof organisationModuleAccess.$inferSelect;
