import { uuid, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { prospectlySchema } from "./schema-definition";

export const emailTemplateSchema = prospectlySchema.table("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  subject: varchar("subject").notNull(),
  slug: varchar("slug").notNull(),
  htmlContent: text("html_content").notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  category: text("category").notNull(),
  description: text("description"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at"),
});
