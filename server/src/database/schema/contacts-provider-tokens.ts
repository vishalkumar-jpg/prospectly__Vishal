import {
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const contactsProviderTokens = prospectlySchema.table(
  "contact_provider_tokens",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(), // 'google' | 'apple' | 'microsoft' | etc.
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"), // nullable - some providers may not have refresh tokens
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }), // nullable - some providers may not expire
    email: varchar("email", { length: 255 }),
    /** True for the primary import account (e.g. IdP login); additional accounts are false */
    isPrimary: boolean("is_primary").notNull().default(true),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_contact_provider_tokens_user_id").on(table.userId),
    providerIdx: index("idx_contact_provider_tokens_provider").on(
      table.provider
    ),
    userProviderIdx: index("idx_contact_provider_tokens_user_provider").on(
      table.userId,
      table.provider
    ),
    userProviderEmailIdx: index(
      "idx_contact_provider_tokens_user_provider_email"
    ).on(table.userId, table.provider, table.email),
  })
);

export type ContactsProviderToken = typeof contactsProviderTokens.$inferSelect;
export type NewContactsProviderToken =
  typeof contactsProviderTokens.$inferInsert;
