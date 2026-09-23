import { uuid, text, timestamp } from "drizzle-orm/pg-core";
import { rolesSchema } from "./role.schema";
import { prospectlySchema } from "./schema-definition";
import { panelEnum } from "./enums";

export const rolePermissionSchema = prospectlySchema.table("role_permission", {
  id: uuid("id").primaryKey().defaultRandom(),
  roleId: uuid("role_id")
    .references(() => rolesSchema.id, { onDelete: "cascade" })
    .notNull(),
  permissions: text("permissions").array().notNull(),
  module: text("module").notNull(),
  panel: panelEnum("panel").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
});
