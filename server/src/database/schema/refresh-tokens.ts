import { uuid, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const refreshTokens = prospectlySchema.table(
  "refresh_tokens",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    isRevoked: boolean("is_revoked").default(false).notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
  },
  (table) => ({
    userIdIdx: index("refresh_tokens_user_id_idx").on(table.userId),
    tokenHashIdx: index("refresh_tokens_token_hash_idx").on(table.tokenHash),
    expiresAtIdx: index("refresh_tokens_expires_at_idx").on(table.expiresAt),
  })
);

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;
