import { uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { prospectlySchema } from "./schema-definition";

export const organisation = prospectlySchema.table("organisation", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  website: varchar("website", { length: 255 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at"),
});
