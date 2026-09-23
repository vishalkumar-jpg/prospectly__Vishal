import {
  uuid,
  jsonb,
  text,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { userInvites } from "./user-invites.schema";
import { prospectlySchema } from "./schema-definition";

// Note: user_invites table is created by admin repo
// We reference it here for FK relationship, but the table may not exist yet
// The FK will be added when admin repo creates the table

export const inviteVerificationLogs = prospectlySchema.table(
  "invite_verification_logs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    inviteId: uuid("invite_id")
      .references(() => userInvites.id, { onDelete: "cascade" })
      .notNull(), // FK to user_invites.id (created by admin repo)
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }), // User attempting to accept
    verificationType: varchar("verification_type", { length: 50 }).notNull(), // "email_match", "contact_import", "subscription_created"
    verificationStatus: varchar("verification_status", {
      length: 50,
    }).notNull(), // "passed", "failed", "suspicious"
    verificationData: jsonb("verification_data"), // Details of verification
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    fraudSignals: jsonb("fraud_signals"), // Array of detected fraud signals
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    inviteIdIdx: index("idx_invite_verification_logs_invite_id").on(
      table.inviteId
    ),
    userIdIdx: index("idx_invite_verification_logs_user_id").on(table.userId),
    verificationTypeIdx: index(
      "idx_invite_verification_logs_verification_type"
    ).on(table.verificationType),
    verificationStatusIdx: index(
      "idx_invite_verification_logs_verification_status"
    ).on(table.verificationStatus),
    createdAtIdx: index("idx_invite_verification_logs_created_at").on(
      table.createdAt
    ),
  })
);

export type InviteVerificationLog = typeof inviteVerificationLogs.$inferSelect;
