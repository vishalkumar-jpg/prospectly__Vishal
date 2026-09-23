import { uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { prospectlySchema } from "./schema-definition";
import { panelEnum } from "./enums";

export const rolesSchema = prospectlySchema.table("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  panel: panelEnum("panel").notNull().default("admin"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
});
