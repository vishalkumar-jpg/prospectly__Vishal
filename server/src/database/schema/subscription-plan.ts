import {
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";

export const subscriptionPlan = prospectlySchema.table(
  "subscription_plan",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    description: text("description").notNull(),
    stripePlanId: text("stripe_plan_id").notNull(),
    feature: jsonb("feature").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    defaultPlan: boolean("default_plan"),
    maxConcurrentRequests: integer("max_concurrent_requests"),
    maxEnrichmentRequest: integer("max_enrichment_request"),
  },
  (table) => ({
    stripePlanIdIdx: index("idx_subscription_plan_stripe_plan_id").on(
      table.stripePlanId
    ),
    isActiveIdx: index("idx_subscription_plan_is_active").on(table.isActive),
    defaultPlanIdx: index("idx_subscription_plan_default_plan").on(
      table.defaultPlan
    ),
  })
);

export type SubscriptionPlan = typeof subscriptionPlan.$inferSelect;
