import {
  uuid,
  jsonb,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { subscriptionPlan } from "./subscription-plan";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

// Note: This table is created by admin repo
// We define the schema here for type safety and relations
// The actual table creation happens in admin repo migrations

export const userInvites = prospectlySchema.table(
  "user_invites",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    inviteToken: text("invite_token").notNull().unique(), // Unique token for invite link
    email: text("email").notNull(), // Invited user email (case-insensitive matching)
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }), // NULL if admin invite
    invitedByAdminId: text("invited_by_admin_id"), // Admin user ID if admin invite
    organisationId: uuid("organisation_id"), // If org leader invite - auto-add user to org on join
    subscriptionPlanId: uuid("subscription_plan_id")
      .notNull()
      .references(() => subscriptionPlan.id, { onDelete: "restrict" }), // Plan being invited for
    stripeCouponId: text("stripe_coupon_id"), // Stripe coupon code (NULL for free plan invites)
    stripeCustomerId: text("stripe_customer_id"), // If customer-specific coupon (set after user creates Stripe customer)
    inviteType: text("invite_type").notNull(), // "ADMIN", "USER_REFERRAL", "ORG_LEADER"
    referralCreditedTo: uuid("referral_credited_to").references(
      () => users.id,
      {
        onDelete: "set null",
      }
    ), // Who gets credit (NULL = Prospectly)
    status: text("status").notNull(), // "PENDING", "ACCEPTED", "EXPIRED", "CANCELLED"
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // Configurable days from creation (default 30)
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedUserId: uuid("accepted_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    emailOpenedAt: timestamp("email_opened_at", { withTimezone: true }),
    emailClickedAt: timestamp("email_clicked_at", { withTimezone: true }),
    resendEmailId: text("resend_email_id"), // For tracking
    canResend: boolean("can_resend").default(true), // Allow resending if expired
    metadata: jsonb("metadata"), // Additional context
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    inviteTokenIdx: index("idx_user_invites_token").on(table.inviteToken),
    emailIdx: index("idx_user_invites_email").on(table.email),
    statusIdx: index("idx_user_invites_status").on(table.status),
    expiresAtIdx: index("idx_user_invites_expires_at").on(table.expiresAt),
    invitedByUserIdIdx: index("idx_user_invites_invited_by").on(
      table.invitedByUserId
    ),
    stripeCouponIdIdx: index("idx_user_invites_stripe_coupon").on(
      table.stripeCouponId
    ),
    emailStatusIdx: index("idx_user_invites_email_status").on(
      table.email,
      table.status
    ),
  })
);

export type UserInvite = typeof userInvites.$inferSelect;
