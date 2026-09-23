import { uuid, jsonb, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { subscriptionPlan } from "./subscription-plan";
import { userInvites } from "./user-invites.schema";
import { referralProgress } from "./referral-progress.schema";
import { prospectlySchema } from "./schema-definition";

// Note: user_invites and referral_progress tables are created by admin repo
// We reference them here for FK relationships, but the tables may not exist yet
// The FKs will be added when admin repo creates the tables

export const referralAuditLog = prospectlySchema.table(
  "referral_audit_log",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }), // User performing action
    actionType: text("action_type").notNull(), // "invite_sent", "invite_accepted", "threshold_met", "coupon_earned", "coupon_used"
    inviteId: uuid("invite_id").references(() => userInvites.id, {
      onDelete: "set null",
    }), // FK to user_invites.id (created by admin repo)
    referralProgressId: uuid("referral_progress_id").references(
      () => referralProgress.id,
      {
        onDelete: "set null",
      }
    ), // FK to referral_progress.id (created by admin repo)
    planId: uuid("plan_id").references(() => subscriptionPlan.id, {
      onDelete: "set null",
    }),
    details: jsonb("details"), // Action-specific details
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_referral_audit_log_user_id").on(table.userId),
    inviteIdIdx: index("idx_referral_audit_log_invite_id").on(table.inviteId),
    referralProgressIdIdx: index(
      "idx_referral_audit_log_referral_progress_id"
    ).on(table.referralProgressId),
    actionTypeIdx: index("idx_referral_audit_log_action_type").on(
      table.actionType
    ),
    createdAtIdx: index("idx_referral_audit_log_created_at").on(
      table.createdAt
    ),
  })
);

export type ReferralAuditLog = typeof referralAuditLog.$inferSelect;
