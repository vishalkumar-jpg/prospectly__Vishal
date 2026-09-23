import {
  uuid,
  jsonb,
  text,
  timestamp,
  boolean,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { subscriptionPlan } from "./subscription-plan";
import { subscriptionPlanPrice } from "./subscription-plan-price";
import { userInvites } from "./user-invites.schema";
import { prospectlySchema } from "./schema-definition";

export const userSubscription = prospectlySchema.table(
  "user_subscription",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    subscriptionPlanId: uuid("subscription_plan_id")
      .notNull()
      .references(() => subscriptionPlan.id, { onDelete: "restrict" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    priceId: uuid("price_id")
      .notNull()
      .references(() => subscriptionPlanPrice.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 30 }).notNull(),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", {
      withTimezone: true,
    }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    inviteId: uuid("invite_id").references(() => userInvites.id, {
      onDelete: "cascade",
    }), // FK to user_invites.id (created by admin repo)
    couponApplied: text("coupon_applied"), // Stripe coupon ID
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    metadata: jsonb("metadata").default({}), // Additional metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
  },
  (table) => ({
    userIdIdx: index("idx_user_subscription_user_id").on(table.userId),
    subscriptionPlanIdIdx: index(
      "idx_user_subscription_subscription_plan_id"
    ).on(table.subscriptionPlanId),
    stripeSubscriptionIdIdx: index(
      "idx_user_subscription_stripe_subscription_id"
    ).on(table.stripeSubscriptionId),
    priceIdIdx: index("idx_user_subscription_price_id").on(table.priceId),
    statusIdx: index("idx_user_subscription_status").on(table.status),
    inviteIdIdx: index("idx_user_subscription_invite_id").on(table.inviteId),
    couponAppliedIdx: index("idx_user_subscription_coupon_applied").on(
      table.couponApplied
    ),
  })
);

export type UserSubscription = typeof userSubscription.$inferSelect;
