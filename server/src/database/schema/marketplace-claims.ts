import {
  uuid,
  varchar,
  timestamp,
  text,
  numeric,
  bigint,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { introductionRequests } from "./introduction-requests";
import { contacts } from "./contacts";
import { prospectlySchema } from "./schema-definition";

export const marketplaceClaims = prospectlySchema.table(
  "marketplace_claims",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    introductionRequestId: uuid("introduction_request_id")
      .notNull()
      .references(() => introductionRequests.id, { onDelete: "cascade" }),
    claimerId: uuid("claimer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sharerCode: varchar("sharer_code", { length: 50 }).notNull(),
    sharerId: uuid("sharer_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 30 }).notNull().default("pending"),
    failureReason: text("failure_reason"),
    verificationCompletedAt: timestamp("verification_completed_at", {
      withTimezone: true,
    }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    claimerShare: numeric("claimer_share", { precision: 10, scale: 2 }),
    sharerShare: numeric("sharer_share", { precision: 10, scale: 2 }),

    // Verification tracking columns (consolidated from claim_verifications)
    sourcesChecked: text("sources_checked")
      .array()
      .default(sql`'{}'::text[]`),
    matchedContactId: bigint("matched_contact_id", {
      mode: "number",
    }).references(() => contacts.id, { onDelete: "set null" }),
    matchedSource: varchar("matched_source", { length: 50 }),

    // Manual verification trigger tracking (one-time only)
    verificationTriggeredAt: timestamp("verification_triggered_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    statusCheck: check(
      "marketplace_claims_status_check",
      sql`${table.status} IN ('pending', 'verifying', 'verified', 'completed', 'failed', 'in_progress')`
    ),
    requestIdx: index("idx_marketplace_claims_request").on(
      table.introductionRequestId
    ),
    claimerIdx: index("idx_marketplace_claims_claimer").on(table.claimerId),
    sharerIdx: index("idx_marketplace_claims_sharer").on(table.sharerId),
    statusIdx: index("idx_marketplace_claims_status").on(table.status),
    sharerCodeIdx: index("idx_marketplace_claims_sharer_code").on(
      table.sharerCode
    ),
  })
);

export type MarketplaceClaim = typeof marketplaceClaims.$inferSelect;
export type NewMarketplaceClaim = typeof marketplaceClaims.$inferInsert;
