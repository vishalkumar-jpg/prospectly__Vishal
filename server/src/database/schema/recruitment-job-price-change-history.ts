import {
  uuid,
  varchar,
  timestamp,
  numeric,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentJobsSchema } from "./recruitment-jobs";
import { recruitmentJobPricesSchema } from "./recruitment-job-prices";

// Append-only audit trail of pricing changes made after a job is published.
// Generic by design: `fieldKey` names which pricing field changed (Phase 1 only
// writes "flat_referral_amount"; Phase 2 success-fee edits reuse this table with
// a different key — no schema churn). `snapshot` stores the full recomputed
// pricing columns at the moment of the change for reconciliation/debugging.
export const recruitmentJobPriceChangeHistory = prospectlySchema.table(
  "recruitment_job_price_change_history",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: uuid("job_id")
      .notNull()
      .references(() => recruitmentJobsSchema.id),
    jobPriceId: uuid("job_price_id")
      .notNull()
      .references(() => recruitmentJobPricesSchema.id),
    // Which pricing field changed, e.g. "flat_referral_amount".
    fieldKey: varchar("field_key", { length: 50 }).notNull(),
    oldValue: numeric("old_value", { precision: 10, scale: 2 }),
    newValue: numeric("new_value", { precision: 10, scale: 2 }),
    // Full recomputed pricing snapshot at the time of the change.
    snapshot: jsonb("snapshot").default("{}"),
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
    jobIdIdx: index("idx_job_price_change_history_job_id").on(table.jobId),
    fieldKeyIdx: index("idx_job_price_change_history_field_key").on(
      table.fieldKey
    ),
  })
);

export type RecruitmentJobPriceChangeHistory =
  typeof recruitmentJobPriceChangeHistory.$inferSelect;
export type NewRecruitmentJobPriceChangeHistory =
  typeof recruitmentJobPriceChangeHistory.$inferInsert;
