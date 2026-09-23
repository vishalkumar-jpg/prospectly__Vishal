import {
  uuid,
  text,
  timestamp,
  boolean,
  index,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const calendarIntegrations = prospectlySchema.table(
  "calendar_integrations",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 30 }).notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    email: varchar("email", { length: 255 }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_calendar_integrations_user_id").on(table.userId),
    providerIdx: index("idx_calendar_integrations_provider").on(table.provider),
  })
);

export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;
