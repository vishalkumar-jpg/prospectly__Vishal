import { uuid, varchar, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const privacy = prospectlySchema.table(
  "user_privacy",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 255 }).notNull(),
    reason: varchar("reason", { length: 50 }).notNull(),
    hideProfile: boolean("hide_profile").default(false).notNull(),
    hideBounties: boolean("hide_bounties").default(false).notNull(),
    excludeFromSearch: boolean("exclude_from_search").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: varchar("created_by", { length: 255 }),
    updatedBy: varchar("updated_by", { length: 255 }),
  },
  (table) => ({
    userIdIdx: index("idx_user_privacy_user_id").on(table.userId),
    domainIdx: index("idx_user_privacy_domain").on(table.domain),
  })
);

export type Privacy = typeof privacy.$inferSelect;
