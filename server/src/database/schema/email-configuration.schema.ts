import { uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { prospectlySchema } from "./schema-definition";

export const emailConfigurationSchema = prospectlySchema.table(
  "email_configurations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    defaultFromName: varchar("default_from_name").notNull(),
    defaultFromEmail: varchar("default_from_email").notNull(),
    defaultReplyToEmail: varchar("default_reply_to_email").notNull(),
    companyAddress: text("company_address"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    deletedAt: timestamp("deleted_at"),
  }
);
