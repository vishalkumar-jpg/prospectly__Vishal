import {
  uuid,
  text,
  timestamp,
  varchar,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

/** Audit trail for AI provider calls (Gemini today; provider column allows others later). */
export const aiUsageLogs = prospectlySchema.table(
  "ai_usage_logs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actionType: varchar("action_type", { length: 64 }),
    provider: varchar("provider", { length: 32 }).notNull(),
    model: varchar("model", { length: 128 }).notNull(),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    totalTokens: integer("total_tokens"),
    status: varchar("status", { length: 16 }).notNull(),
    errorMessage: text("error_message"),
    responseTimeMs: integer("response_time_ms").notNull(),
    retryCount: integer("retry_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_ai_usage_logs_user_id").on(table.userId),
    actionTypeIdx: index("idx_ai_usage_logs_action_type").on(table.actionType),
    createdAtIdx: index("idx_ai_usage_logs_created_at").on(table.createdAt),
    providerIdx: index("idx_ai_usage_logs_provider").on(table.provider),
  })
);

export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
