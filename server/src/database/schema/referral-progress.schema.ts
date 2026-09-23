import { uuid, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

// Note: This table is created by admin repo
// We define the schema here for type safety and relations
// The actual table creation happens in admin repo migrations

export const referralProgress = prospectlySchema.table(
  "referral_progress",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }), // One record per user
    totalInvitesSent: integer("total_invites_sent").default(0),
    totalInvitesAccepted: integer("total_invites_accepted").default(0),
    acceptedUsers: jsonb("accepted_users").default([]), // Array of: [{userId, email, fullName, subscriptionPlan, acceptedAt}]
    invitedUsers: jsonb("invited_users").default([]), // [{email, fullName, subscriptionPlan, invitedAt, contactId?, subscriptionPlanId?, expiresAt?, organisationId?}]
    earnedCoupons: jsonb("earned_coupons").default([]), // Array of: [{plan_id, stripe_coupon_id, earned_at, used_at, threshold_met}]
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_referral_progress_user_id").on(table.userId),
    earnedCouponsIdx: index("idx_referral_progress_earned_coupons").using(
      "gin",
      table.earnedCoupons
    ),
  })
);

export type ReferralProgress = typeof referralProgress.$inferSelect;
