import {
  uuid,
  timestamp,
  numeric,
  varchar,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { creditRulesSchema } from "./credit-rules.schema";
import { prospectlySchema } from "./schema-definition";

/**
 * User Credit Awards Table
 *
 * Tracks which credit awards have been given to each user per provider.
 * Prevents duplicate credit awards for the same provider.
 * One award per provider per user.
 */
export const userCreditAwards = prospectlySchema.table(
  "user_credit_awards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(),
    creditRuleId: uuid("credit_rule_id")
      .notNull()
      .references(() => creditRulesSchema.id, { onDelete: "restrict" }),
    contactsAtAward: integer("contacts_at_award").notNull(),
    creditsAwarded: numeric("credits_awarded", {
      precision: 10,
      scale: 2,
    }).notNull(),
    awardedAt: timestamp("awarded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_user_credit_awards_user_id").on(table.userId),
    providerIdx: index("idx_user_credit_awards_provider").on(table.provider),
    userProviderUnique: unique("unique_user_credit_award_provider").on(
      table.userId,
      table.provider
    ),
  })
);

export type UserCreditAward = typeof userCreditAwards.$inferSelect;
export type NewUserCreditAward = typeof userCreditAwards.$inferInsert;
