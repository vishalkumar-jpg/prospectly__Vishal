import {
  uuid,
  text,
  timestamp,
  numeric,
  index,
  varchar,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { introductionRequests } from "./introduction-requests";
import { prospectlySchema } from "./schema-definition";

export const introductionTransactions = prospectlySchema.table(
  "introduction_transactions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    introductionRequestId: uuid("introduction_request_id")
      .notNull()
      .references(() => introductionRequests.id, { onDelete: "cascade" }),

    isActive: boolean("is_active").notNull().default(true),

    paymentMethodId: varchar("payment_method_id", { length: 50 }),

    totalAuthorizedAmount: numeric("total_authorized_amount", {
      precision: 10,
      scale: 2,
    }).default("0"),
    totalCapturedAmount: numeric("total_captured_amount", {
      precision: 10,
      scale: 2,
    }).default("0"),
    overallStatus: varchar("overall_status", { length: 30 }).default("pending"),
    paymentAuthorizedAt: timestamp("payment_authorized_at", {
      withTimezone: true,
    }),
    fullyPaidAt: timestamp("fully_paid_at", { withTimezone: true }),
    paymentError: text("payment_error"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    introRequestIdx: index("idx_intro_transactions_request").on(
      table.introductionRequestId
    ),
    overallStatusIdx: index("idx_intro_transactions_overall_status").on(
      table.overallStatus
    ),
    paymentMethodIdx: index("idx_intro_transactions_payment_method").on(
      table.paymentMethodId
    ),
    isActiveIdx: index("idx_intro_transactions_is_active").on(table.isActive),
    oneActivePerRequestIdx: uniqueIndex(
      "idx_intro_transactions_one_active_per_request"
    )
      .on(table.introductionRequestId)
      .where(sql`${table.isActive} = true`),
  })
);

export type IntroductionTransaction =
  typeof introductionTransactions.$inferSelect;
