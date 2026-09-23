import {
  uuid,
  text,
  timestamp,
  numeric,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { trustScoreRules } from "./trust-score-rules.schema";
import { prospectlySchema } from "./schema-definition";

export const triggeredByEnum = prospectlySchema.enum(
  "trust_score_triggered_by",
  ["SYSTEM", "ADMIN", "USER_ACTION"]
);

export const userTrustScoreHistory = prospectlySchema.table(
  "user_trust_score_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => trustScoreRules.id, { onDelete: "restrict" }),
    previousScore: numeric("previous_score", { precision: 4, scale: 1 }),
    newScore: numeric("new_score", { precision: 4, scale: 1 }),
    pointsChange: numeric("points_change", { precision: 4, scale: 1 }),
    actionType: text("action_type").notNull(),
    evidence: jsonb("evidence").notNull(),
    metadata: jsonb("metadata"),
    triggeredBy: triggeredByEnum("triggered_by"),
    triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_user_trust_score_history_user_id").on(table.userId),
    ruleIdIdx: index("idx_user_trust_score_history_rule_id").on(table.ruleId),
    triggeredAtIdx: index("idx_user_trust_score_history_triggered_at").on(
      table.triggeredAt
    ),
    userTriggeredIdx: index("idx_user_trust_score_history_user_triggered").on(
      table.userId,
      table.triggeredAt
    ),
  })
);

export type UserTrustScoreHistory = typeof userTrustScoreHistory.$inferSelect;
