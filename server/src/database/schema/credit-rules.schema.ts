import { uuid, text, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { prospectlySchema } from "./schema-definition";

export const creditRulesSchema = prospectlySchema.table("credit_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  contactImport: numeric("contact_import").default("0"),
  credits: numeric("credits", { precision: 10, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at"),
});
