import {
  uuid,
  text,
  timestamp,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { introductionRequests } from "./introduction-requests";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const disputes = prospectlySchema.table(
  "disputes",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    introductionRequestId: uuid("introduction_request_id")
      .notNull()
      .references(() => introductionRequests.id, { onDelete: "cascade" }),
    filedByUserId: uuid("filed_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    disputeType: text("dispute_type").notNull(),
    disputeCategory: text("dispute_category"),
    priority: text("priority").notNull().default("medium"),
    status: text("status").notNull().default("pending"),
    reason: text("reason").notNull(),
    expectedOutcome: text("expected_outcome"),
    evidenceUrls: text("evidence_urls").array(),
    disputedAmount: numeric("disputed_amount", {
      precision: 10,
      scale: 2,
    }),
    requestedRefundAmount: numeric("requested_refund_amount", {
      precision: 10,
      scale: 2,
    }),
    againstUserId: uuid("against_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolutionNotes: text("resolution_notes"),
    resolvedBy: uuid("resolved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionAction: text("resolution_action"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    introductionRequestIdx: index("idx_disputes_introduction_request").on(
      table.introductionRequestId
    ),
    filedByUserIdx: index("idx_disputes_filed_by_user").on(table.filedByUserId),
    againstUserIdx: index("idx_disputes_against_user").on(table.againstUserId),
    uniqueActiveDisputeIdx: uniqueIndex("idx_unique_active_dispute")
      .on(table.introductionRequestId)
      .where(sql`${table.status} IN ('pending', 'under_review')`),
  })
);

export type Dispute = typeof disputes.$inferSelect;
export type NewDispute = typeof disputes.$inferInsert;
