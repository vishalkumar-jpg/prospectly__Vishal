import { uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { rolesSchema } from "./role.schema";
import { prospectlySchema } from "./schema-definition";

export const userRolesSchema = prospectlySchema.table("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id")
    .notNull()
    .references(() => rolesSchema.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at"),
});
