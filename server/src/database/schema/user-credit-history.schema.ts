import {
  uuid,
  timestamp,
  numeric,
  varchar,
  integer,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { creditRulesSchema } from "./credit-rules.schema";
import { introductionRequests } from "./introduction-requests";
import { payoutHistory } from "./payout-history";
import { prospectlySchema } from "./schema-definition";

/**
 * Credit transaction type enum
 */
export const creditTransactionTypeEnum = prospectlySchema.enum(
  "credit_transaction_type",
  ["earned", "used"]
);

/**
 * User Credit History Table
 *
 * Full audit trail for all credit transactions (earned and used).
 * This is the ledger for tracking credits.
 */
export const userCreditHistory = prospectlySchema.table(
  "user_credit_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    creditRuleId: uuid("credit_rule_id").references(
      () => creditRulesSchema.id,
      { onDelete: "set null" }
    ),
    transactionType: creditTransactionTypeEnum("transaction_type").notNull(),
    provider: varchar("provider", { length: 50 }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    balanceBefore: numeric("balance_before", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    balanceAfter: numeric("balance_after", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    introductionRequestId: uuid("introduction_request_id").references(
      () => introductionRequests.id,
      { onDelete: "set null" }
    ),
    payoutHistoryId: uuid("payout_history_id").references(
      () => payoutHistory.id,
      { onDelete: "set null" }
    ),
    enrichedContactsCount: integer("enriched_contacts_count"),
    evidence: jsonb("evidence"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_user_credit_history_user_id").on(table.userId),
    userCreatedAtIdx: index("idx_user_credit_history_user_created").on(
      table.userId,
      table.createdAt
    ),
    transactionTypeIdx: index("idx_user_credit_history_type").on(
      table.transactionType
    ),
    creditRuleIdIdx: index("idx_user_credit_history_rule").on(
      table.creditRuleId
    ),
  })
);

export type UserCreditHistory = typeof userCreditHistory.$inferSelect;
export type NewUserCreditHistory = typeof userCreditHistory.$inferInsert;
