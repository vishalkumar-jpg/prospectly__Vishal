import { varchar, timestamp } from "drizzle-orm/pg-core";
import { prospectlySchema } from "./schema-definition";

export const emailSuppressions = prospectlySchema.table("email_suppressions", {
  email: varchar("email", { length: 255 }).primaryKey(),
  reason: varchar("reason", { length: 30 }).notNull(),
  source: varchar("source", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmailSuppression = typeof emailSuppressions.$inferSelect;
