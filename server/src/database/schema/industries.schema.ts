import { serial, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { prospectlySchema } from "./schema-definition";

export const industriesSchema = prospectlySchema.table("industries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Industry = typeof industriesSchema.$inferSelect;
