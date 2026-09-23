import {
  uuid,
  varchar,
  text,
  boolean,
  smallint,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";

export const notificationCategories = prospectlySchema.table(
  "notification_categories",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    key: varchar("key", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    groupKey: varchar("group_key", { length: 64 }).notNull(),
    isMandatory: boolean("is_mandatory").notNull().default(false),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [uniqueIndex("notification_categories_key_unique").on(table.key)]
);

export type NotificationCategory = typeof notificationCategories.$inferSelect;
