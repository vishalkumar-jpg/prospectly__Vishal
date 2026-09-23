import {
  uuid,
  jsonb,
  text,
  timestamp,
  numeric,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { userSubscription } from "./user-subscription";
import { subscriptionPlan } from "./subscription-plan";
import { prospectlySchema } from "./schema-definition";

export const subscriptionTransactions = prospectlySchema.table(
  "subscription_transactions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    subscriptionId: uuid("subscription_id").references(
      () => userSubscription.id,
      { onDelete: "set null" }
    ),
    transactionType: varchar("transaction_type", { length: 50 }).notNull(), // "created", "upgraded", "downgraded", "canceled", "renewed", "coupon_applied"
    fromPlanId: uuid("from_plan_id").references(() => subscriptionPlan.id, {
      onDelete: "set null",
    }),
    toPlanId: uuid("to_plan_id").references(() => subscriptionPlan.id, {
      onDelete: "set null",
    }),
    stripeEventId: text("stripe_event_id"),
    amount: numeric("amount", { precision: 10, scale: 2 }),
    currency: varchar("currency", { length: 10 }).default("usd"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_subscription_transactions_user_id").on(table.userId),
    subscriptionIdIdx: index(
      "idx_subscription_transactions_subscription_id"
    ).on(table.subscriptionId),
    transactionTypeIdx: index(
      "idx_subscription_transactions_transaction_type"
    ).on(table.transactionType),
    createdAtIdx: index("idx_subscription_transactions_created_at").on(
      table.createdAt
    ),
  })
);

export type SubscriptionTransaction =
  typeof subscriptionTransactions.$inferSelect;
