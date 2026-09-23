import {
  uuid,
  text,
  timestamp,
  numeric,
  varchar,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentJobCandidates } from "./recruitment-job-candidates";
import { recruitmentJobsSchema } from "./recruitment-jobs";

// Polymorphic per-fee-type transactions. One row per (candidate, fee-type):
// - 'interview_cost' — manual-capture PI for the connector bounty + platform fees
//                      (recruiter-side cost of unlocking the interview)
// - 'success_fee'    — separate PI captured at booking when hasSuccessFee=true,
//                      funds the candidate's retention bonus (100% to candidate)
//
// New fee types are added by inserting rows with a new transactionType value —
// no column migrations. Mirrors the payoutType discriminator pattern on
// recruitment_payout_history.
export const recruitmentInterviewTransactions = prospectlySchema.table(
  "recruitment_interview_transactions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => recruitmentJobCandidates.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => recruitmentJobsSchema.id),
    recruiterId: uuid("recruiter_id")
      .notNull()
      .references(() => users.id),
    connectorUserId: uuid("connector_user_id").references(() => users.id),
    transactionType: varchar("transaction_type", { length: 30 })
      .default("interview_cost")
      .notNull(),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    intentId: varchar("intent_id", { length: 100 }),
    paymentMethodId: varchar("payment_method_id", { length: 100 }),
    status: varchar("status", { length: 30 }).default("pending").notNull(),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    chargeAmount: numeric("charge_amount", { precision: 10, scale: 2 }),
    receiptUrl: text("receipt_url"),
    paymentError: text("payment_error"),
    metadata: jsonb("metadata").default("{}"),
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
    candidateIdIdx: index("idx_interview_txn_candidate_id").on(
      table.candidateId
    ),
    jobIdIdx: index("idx_interview_txn_job_id").on(table.jobId),
    intentIdIdx: index("idx_interview_txn_intent_id").on(table.intentId),
    statusIdx: index("idx_interview_txn_status").on(table.status),
    typeIdx: index("idx_interview_txn_type").on(table.transactionType),
    uniqCandidateType: uniqueIndex("uniq_interview_txn_candidate_type")
      .on(table.candidateId, table.transactionType)
      .where(
        sql`deleted_at IS NULL AND transaction_type NOT IN ('flat_topup', 'success_fee_topup')`
      ),
    uniqIntentId: uniqueIndex("uniq_interview_txn_intent_id")
      .on(table.intentId)
      .where(sql`intent_id IS NOT NULL AND deleted_at IS NULL`),
    uniqFlatDepositPerJob: uniqueIndex("uniq_interview_txn_flat_deposit_job")
      .on(table.jobId)
      .where(sql`transaction_type = 'flat_deposit' AND deleted_at IS NULL`),
  })
);

export type RecruitmentInterviewTransaction =
  typeof recruitmentInterviewTransactions.$inferSelect;
export type NewRecruitmentInterviewTransaction =
  typeof recruitmentInterviewTransactions.$inferInsert;
