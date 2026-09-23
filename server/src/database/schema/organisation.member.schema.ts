import {
  uuid,
  boolean,
  timestamp,
  varchar,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organisation } from "./organisation.schema";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const organisationMemberSchema = prospectlySchema.table(
  "organisation_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisation.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isVerified: boolean("is_verified").default(false).notNull(),
    verifiedAt: timestamp("verified_at"),
    invitedBy: text("invited_by"),
    inviteCode: varchar("invite_code", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    uniqueOrgUser: uniqueIndex("organisation_users_org_user_unique")
      .on(table.organisationId, table.userId)
      .where(sql`${table.deletedAt} IS NULL`),
  })
);
