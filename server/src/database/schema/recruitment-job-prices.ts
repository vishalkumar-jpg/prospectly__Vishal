import {
  uuid,
  varchar,
  timestamp,
  numeric,
  uniqueIndex,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentJobsSchema } from "./recruitment-jobs";

export const recruitmentJobPricesSchema = prospectlySchema.table(
  "recruitment_job_prices",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: uuid("job_id")
      .notNull()
      .references(() => recruitmentJobsSchema.id),
    salaryRangeMin: numeric("salary_range_min", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    salaryRangeMax: numeric("salary_range_max", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    salaryCurrency: varchar("salary_currency", { length: 10 }).default("USD"),
    salaryPeriod: varchar("salary_period", { length: 20 }).default("yearly"),
    salaryRangeNotes: varchar("salary_range_notes", { length: 255 }),
    bountyAmount: numeric("bounty_amount", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    suggestedBountyAmount: numeric("suggested_bounty_amount", {
      precision: 10,
      scale: 2,
    })
      .default("0")
      .notNull(),
    providerFee: numeric("provider_fee", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    processingFee: numeric("processing_fee", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    hasSuccessFee: boolean("has_success_fee").default(false).notNull(),
    successFeeAmount: numeric("success_fee_amount", {
      precision: 10,
      scale: 2,
    }),
    intPayoutWaits: boolean("int_payout_waits").default(false).notNull(),
    extPayoutWaits: boolean("ext_payout_waits").default(false).notNull(),
    intConnectorPayoutWaitDays: integer("int_connector_payout_wait_days"),
    extConnectorPayoutWaitDays: integer("ext_connector_payout_wait_days"),
    pricingModel: varchar("pricing_model", { length: 20 })
      .default("per_interview")
      .notNull(),
    // Flat Referral Model — snapshotted at publish.
    flatReferralAmount: numeric("flat_referral_amount", {
      precision: 10,
      scale: 2,
    }),
    flatDepositFeePercent: numeric("flat_deposit_fee_percent", {
      precision: 5,
      scale: 2,
    }),
    flatDepositAmount: numeric("flat_deposit_amount", {
      precision: 10,
      scale: 2,
    }),
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
    uniqueJobIdIdx: uniqueIndex("idx_recruitment_job_prices_job_id").on(
      table.jobId
    ),
  })
);

export type RecruitmentJobPrices =
  typeof recruitmentJobPricesSchema.$inferSelect;
export type NewRecruitmentJobPrices =
  typeof recruitmentJobPricesSchema.$inferInsert;
