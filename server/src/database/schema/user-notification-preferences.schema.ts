import { uuid, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";
import { notificationCategories } from "./notification-categories.schema";
import { prospectlySchema } from "./schema-definition";

export const userNotificationPreferences = prospectlySchema.table(
  "user_notification_preferences",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => notificationCategories.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.categoryId] })]
);

export type UserNotificationPreference =
  typeof userNotificationPreferences.$inferSelect;
