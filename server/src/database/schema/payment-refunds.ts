import {
  uuid,
  varchar,
  numeric,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { introductionRequests } from "./introduction-requests";
import { introductionTransactions } from "./introduction-transactions";
import { paymentStages } from "./payment-stages";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const paymentRefunds = prospectlySchema.table(
  "payment_refunds",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    introductionRequestId: uuid("introduction_request_id")
      .notNull()
      .references(() => introductionRequests.id, { onDelete: "cascade" }),
    introductionTransactionId: uuid("introduction_transaction_id")
      .notNull()
      .references(() => introductionTransactions.id, { onDelete: "cascade" }),
    paymentStageId: uuid("payment_stage_id")
      .notNull()
      .references(() => paymentStages.id, { onDelete: "cascade" }),
    stripeRefundId: varchar("stripe_refund_id", { length: 100 }),
    refundAmount: numeric("refund_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),
    refundReason: varchar("refund_reason", { length: 50 }).notNull(),
    refundStatus: varchar("refund_status", { length: 30 }).default(
      "refund_initiated"
    ),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    initiatedBy: varchar("initiated_by", { length: 20 }).notNull(),
    initiatedByUserId: uuid("initiated_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    // UNIQUE constraint guarantees no double refund per payment stage
    uniquePaymentStage: unique("unique_payment_stage_refund").on(
      table.paymentStageId
    ),
    requestIdx: index("idx_payment_refunds_request").on(
      table.introductionRequestId
    ),
    statusIdx: index("idx_payment_refunds_status").on(table.refundStatus),
    transactionIdx: index("idx_payment_refunds_transaction").on(
      table.introductionTransactionId
    ),
  })
);

export type PaymentRefund = typeof paymentRefunds.$inferSelect;
export type NewPaymentRefund = typeof paymentRefunds.$inferInsert;
