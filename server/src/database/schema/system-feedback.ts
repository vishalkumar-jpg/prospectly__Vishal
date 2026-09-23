import { uuid, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const systemFeedback = prospectlySchema.table("system_feedback", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // bug, feature, ui_ux, general
  priority: varchar("priority", { length: 50 }).notNull(), // low, medium, high, critical
  status: varchar("status", { length: 50 }).notNull().default("new"), // new, under_review, in_progress, completed, closed
  title: text("title").notNull(),
  description: text("description").notNull(),
  currentPage: text("current_page"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SystemFeedback = typeof systemFeedback.$inferSelect;
