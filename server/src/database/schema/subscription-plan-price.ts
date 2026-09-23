import {
  uuid,
  text,
  timestamp,
  numeric,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { subscriptionPlan } from "./subscription-plan";
import { prospectlySchema } from "./schema-definition";

export const subscriptionPlanPrice = prospectlySchema.table(
  "subscription_plan_price",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    subscriptionPlanId: uuid("subscription_plan_id")
      .notNull()
      .references(() => subscriptionPlan.id, { onDelete: "cascade" }),
    stripePriceId: text("stripe_price_id").notNull(),
    price: numeric("price"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    interval: varchar("interval", { length: 10 }),
  },
  (table) => ({
    subscriptionPlanIdIdx: index(
      "idx_subscription_plan_price_subscription_plan_id"
    ).on(table.subscriptionPlanId),
    stripePriceIdIdx: index("idx_subscription_plan_price_stripe_price_id").on(
      table.stripePriceId
    ),
    intervalIdx: index("idx_subscription_plan_price_interval").on(
      table.interval
    ),
  })
);

export type SubscriptionPlanPrice = typeof subscriptionPlanPrice.$inferSelect;
