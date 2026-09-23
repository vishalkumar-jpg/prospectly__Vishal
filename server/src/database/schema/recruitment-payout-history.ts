import {
  uuid,
  text,
  timestamp,
  numeric,
  varchar,
  integer,
  boolean,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentJobCandidates } from "./recruitment-job-candidates";
import { recruitmentJobsSchema } from "./recruitment-jobs";
import { recruitmentInterviewTransactions } from "./recruitment-interview-transactions";
import { recruitmentInterviewMeetings } from "./recruitment-interview-meetings";

export const recruitmentPayoutHistory = prospectlySchema.table(
  "recruitment_payout_history",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => recruitmentJobCandidates.id, { onDelete: "restrict" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => recruitmentJobsSchema.id),
    recruiterId: uuid("recruiter_id")
      .notNull()
      .references(() => users.id),
    interviewTransactionId: uuid("interview_transaction_id")
      .notNull()
      .references(() => recruitmentInterviewTransactions.id),
    interviewMeetingId: uuid("interview_meeting_id")
      .notNull()
      .references(() => recruitmentInterviewMeetings.id),

    // Payout type & recipient
    payoutType: varchar("payout_type", { length: 20 })
      .notNull()
      .default("connector"),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id),

    // Snapshot amounts at creation time
    grossAmount: numeric("gross_amount", { precision: 10, scale: 2 }).notNull(),
    recipientAmount: numeric("recipient_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),
    platformAmount: numeric("platform_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("usd"),

    // Payout-fee fields: amount actually sent to the recipient after Stripe
    // payout fees are deducted, plus the full fee breakdown (see payout-fees.util).
    recipientReceivedAmount: numeric("recipient_received_amount", {
      precision: 10,
      scale: 2,
    }),
    payoutFeeBreakdown: jsonb("payout_fee_breakdown"),

    // Payment provider fields (Stripe Global Payouts)
    // Recipient account (`acct_…`) the payout was sent to.
    recipientAccountId: varchar("recipient_account_id", {
      length: 255,
    }),
    // Stripe Global Payouts OutboundPayment id (`obp_…`; test-mode ids are long).
    stripeOutboundPaymentId: varchar("stripe_outbound_payment_id", {
      length: 255,
    }),

    // Payout status
    status: varchar("status", { length: 30 }).notNull().default("pending"),

    // True on both rows of a split (marketplace deal) pair. Set at insert time,
    // never mutated. Fast indicator for listing screens; full split info is
    // derivable from the sibling row on the same (candidateId, jobId).
    isMarketplaceDeal: boolean("is_marketplace_deal").notNull().default(false),

    // Credit system fields
    creditsApplied: numeric("credits_applied", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    creditsRemainingAfter: numeric("credits_remaining_after", {
      precision: 10,
      scale: 2,
    })
      .default("0")
      .notNull(),
    commissionAfterCredits: numeric("commission_after_credits", {
      precision: 10,
      scale: 2,
    })
      .default("0")
      .notNull(),

    // Background queue processing fields
    processingStatus: varchar("processing_status", { length: 30 })
      .notNull()
      .default("pending"),
    processingStartedAt: timestamp("processing_started_at", {
      withTimezone: true,
    }),
    processingCompletedAt: timestamp("processing_completed_at", {
      withTimezone: true,
    }),
    retryCount: integer("retry_count").default(0),
    lastRetryAt: timestamp("last_retry_at", { withTimezone: true }),
    queueJobId: varchar("queue_job_id", { length: 100 }),

    errorMessage: text("error_message"),
    // Why a row was cancelled when status='cancelled'.
    // System reasons: 'not_retained' (legacy bucket), 'inactive_employee'.
    // Recruiter-selectable: 'candidate_failed_probation',
    // 'candidate_left_voluntarily', 'position_unavailable',
    // 'performance_issues', 'other'. Free-form context lives in
    // cancellation_notes (only set on the manual cancel-all path).
    cancellationReason: varchar("cancellation_reason", { length: 50 }),
    cancellationNotes: varchar("cancellation_notes", { length: 500 }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
  (table) => ({
    // Unique: one payout per recipient per candidate-job (excludes soft-deleted)
    uniqueCandidateJobRecipient: uniqueIndex(
      "uq_recruitment_payout_candidate_job_recipient"
    )
      .on(table.candidateId, table.jobId, table.recipientId)
      .where(sql`deleted_at IS NULL`),

    // FK lookups
    jobIdIdx: index("idx_recruitment_payout_job_id").on(table.jobId),
    recipientIdIdx: index("idx_recruitment_payout_recipient_id").on(
      table.recipientId
    ),

    // Partial status indexes (only non-terminal states — stays small at scale)
    pendingStatusIdx: index("idx_recruitment_payout_status_active")
      .on(table.status)
      .where(sql`status != 'completed' AND deleted_at IS NULL`),
    activeProcessingIdx: index("idx_recruitment_payout_processing_active")
      .on(table.processingStatus)
      .where(
        sql`processing_status NOT IN ('completed', 'failed') AND deleted_at IS NULL`
      ),

    // Deferred payouts (tiny partial index — only onboarding_pending rows)
    deferredPayoutsIdx: index("idx_recruitment_payout_deferred")
      .on(table.recipientId, table.processingStatus)
      .where(
        sql`deleted_at IS NULL AND processing_status = 'onboarding_pending'`
      ),

    // Payment provider lookups
    outboundPaymentIdx: index("idx_recruitment_payout_outbound_payment").on(
      table.stripeOutboundPaymentId
    ),

    // Payout type filter
    payoutTypeIdx: index("idx_recruitment_payout_type").on(table.payoutType),
  })
);

export type RecruitmentPayoutHistory =
  typeof recruitmentPayoutHistory.$inferSelect;
export type NewRecruitmentPayoutHistory =
  typeof recruitmentPayoutHistory.$inferInsert;
