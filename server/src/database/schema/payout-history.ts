import {
  uuid,
  text,
  timestamp,
  numeric,
  varchar,
  boolean,
  integer,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { introductionRequests } from "./introduction-requests";
import { introductionTransactions } from "./introduction-transactions";
import { prospectlySchema } from "./schema-definition";

export const payoutHistory = prospectlySchema.table(
  "payout_history",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    connectorId: uuid("connector_id").references(() => users.id, {
      onDelete: "set null",
    }),
    introductionRequestId: uuid("introduction_request_id").references(
      () => introductionRequests.id,
      { onDelete: "set null" }
    ),
    introductionTransactionId: uuid("introduction_transaction_id").references(
      () => introductionTransactions.id,
      { onDelete: "set null" }
    ),

    grossAmount: numeric("gross_amount", { precision: 10, scale: 2 }),
    platformCommissionAmount: numeric("platform_commission_amount", {
      precision: 10,
      scale: 2,
    }),
    // Connector's earned amount (gross, before payout fees).
    netAmount: numeric("net_amount", { precision: 10, scale: 2 }).notNull(),

    // Payout-fee fields: amount actually sent to the recipient after Stripe
    // payout fees are deducted, plus the full fee breakdown (see payout-fees.util).
    recipientReceivedAmount: numeric("recipient_received_amount", {
      precision: 10,
      scale: 2,
    }),
    payoutFeeBreakdown: jsonb("payout_fee_breakdown"),

    // Stripe Global Payouts recipient account (`acct_…`) the payout was sent to.
    recipientAccountId: varchar("recipient_account_id", {
      length: 255,
    }),
    // Stripe Global Payouts OutboundPayment id (`obp_…`; test-mode ids are long).
    stripeOutboundPaymentId: varchar("stripe_outbound_payment_id", {
      length: 255,
    }),
    // Recipient's local settlement currency (uppercase ISO 4217). netAmount is
    // always debited from the platform balance in USD; Stripe converts to this.
    destinationCurrency: varchar("destination_currency", { length: 3 }),

    status: varchar("status", { length: 30 }).notNull().default("pending"),
    payoutMode: varchar("payout_mode", { length: 20 }).default("scheduled"),
    payoutEligible: boolean("payout_eligible").default(false),
    payoutReleased: boolean("payout_released").default(false),
    payoutReleasedAt: timestamp("payout_released_at", { withTimezone: true }),

    payoutTriggeredBy: varchar("payout_triggered_by", { length: 30 }),
    trustScoreAtPayout: integer("trust_score_at_payout"),

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

    // Marketplace payout fields
    isMarketplaceDeal: boolean("is_marketplace_deal").default(false),
    marketplaceRole: varchar("marketplace_role", { length: 20 }), // 'claimer' | 'sharer'

    // Background queue processing fields
    processingStatus: varchar("processing_status", { length: 30 }).default(
      "pending"
    ), // pending, queued, processing, completed, failed
    processingStartedAt: timestamp("processing_started_at", {
      withTimezone: true,
    }),
    processingCompletedAt: timestamp("processing_completed_at", {
      withTimezone: true,
    }),
    retryCount: integer("retry_count").default(0),
    lastRetryAt: timestamp("last_retry_at", { withTimezone: true }),
    jobId: varchar("job_id", { length: 100 }), // Bull queue job ID for tracking

    errorMessage: text("error_message"),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    connectorIdx: index("idx_payout_history_connector").on(table.connectorId),
    introRequestIdx: index("idx_payout_history_intro_request").on(
      table.introductionRequestId
    ),
    statusIdx: index("idx_payout_history_status").on(table.status),
    payoutReleasedIdx: index("idx_payout_history_payout_released").on(
      table.payoutReleased
    ),
    stripeOutboundPaymentIdx: index(
      "idx_payout_history_stripe_outbound_payment"
    ).on(table.stripeOutboundPaymentId),
    introTransactionIdx: index("idx_payout_history_intro_transaction").on(
      table.introductionTransactionId
    ),
    isMarketplaceIdx: index("idx_payout_history_is_marketplace").on(
      table.isMarketplaceDeal
    ),
  })
);

export type PayoutHistory = typeof payoutHistory.$inferSelect;
