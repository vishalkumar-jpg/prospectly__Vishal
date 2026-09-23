import {
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  varchar,
  index,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { introductionTransactions } from "./introduction-transactions";
import { prospectlySchema } from "./schema-definition";

export const paymentStages = prospectlySchema.table(
  "payment_stages",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    transactionId: uuid("transaction_id").references(
      () => introductionTransactions.id,
      { onDelete: "set null" }
    ),
    stageName: varchar("stage_name", { length: 50 }).notNull(),
    stageOrder: integer("stage_order").notNull(),
    intentId: varchar("intent_id", { length: 50 }).notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    status: varchar("status", { length: 30 }).default("pending"),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    chargeAmount: numeric("charge_amount", { precision: 10, scale: 2 }),
    receiptUrl: text("receipt_url"),
    metadata: jsonb("metadata").default(sql`'{}'`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    // Prevent duplicate stages per transaction - UNIQUE constraint
    uniqueStageIdx: unique("idx_payment_stages_unique_stage").on(
      table.transactionId,
      table.stageName
    ),
    // Query optimization
    transactionStatusIdx: index("idx_payment_stages_transaction_status").on(
      table.transactionId,
      table.status
    ),
    intentIdx: index("idx_payment_stages_intent").on(table.intentId),
  })
);

export type PaymentStage = typeof paymentStages.$inferSelect;
