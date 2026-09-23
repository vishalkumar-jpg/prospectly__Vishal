import {
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  text,
} from "drizzle-orm/pg-core";
import { organisation } from "./organisation.schema";
import { prospectlySchema } from "./schema-definition";

export const organisationInviteSchema = prospectlySchema.table(
  "organisation_invite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).unique().notNull(),
    organisationId: uuid("organisation_id")
      .references(() => organisation.id, { onDelete: "cascade" })
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: false }),
    usedCount: integer("used_count").default(0).notNull(),
    maxUses: integer("max_uses"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    deletedAt: timestamp("deleted_at"),
  }
);
