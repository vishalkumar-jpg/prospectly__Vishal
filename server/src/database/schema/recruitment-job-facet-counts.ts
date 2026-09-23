import {
  index,
  integer,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { recruitmentJobsSchema } from "./recruitment-jobs";
import { users } from "./users";

/**
 * The facet kinds that need a rollup. Job-side facets (work mode, employment
 * type, industry, country, postings) come from one row per job and are read
 * straight off the accessible job set, so they are deliberately absent here.
 */
export const RECRUITMENT_FACET_KINDS = [
  "skill",
  "title",
  "company",
  "education",
  "source",
] as const;

export type RecruitmentFacetKind = (typeof RECRUITMENT_FACET_KINDS)[number];

/**
 * Pre-aggregated candidate-side facet frequencies, one row per
 * (job, kind, value). `/facets` sums these over the accessible job set instead
 * of scanning every candidate's résumé on first paint (ADR-005 §4.3).
 *
 * `count` is DISTINCT PEOPLE on the job carrying the value, not rows — a person
 * with two candidacies on one posting is one candidate to the recruiter.
 *
 * Derived data: rows are recomputed wholesale per job by
 * `resume-facet-rollup.service.ts` and hard-deleted on recompute, the same call
 * `contact_resume_search` makes. `deleted_at` exists because every table has it.
 */
export const recruitmentJobFacetCounts = prospectlySchema.table(
  "recruitment_job_facet_counts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: uuid("job_id")
      .notNull()
      .references(() => recruitmentJobsSchema.id, { onDelete: "cascade" }),
    facetKind: varchar("facet_kind", { length: 20 }).notNull(),
    /** Grouping key: lower-cased and trimmed, so "React" and "react" are one facet. */
    value: varchar("value", { length: 120 }).notNull(),
    /** The casing the drawer shows for that key. */
    displayValue: varchar("display_value", { length: 120 }).notNull(),
    count: integer("count").notNull(),
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
    jobKindValueUnique: uniqueIndex("uq_recruitment_job_facet_counts_job_value")
      .on(table.jobId, table.facetKind, table.value)
      .where(sql`deleted_at IS NULL`),
    /** Serves the `/facets` grouped sum, which filters kind and groups by value. */
    kindValueIdx: index("idx_recruitment_job_facet_counts_kind_value").on(
      table.facetKind,
      table.value
    ),
  })
);

export type RecruitmentJobFacetCount =
  typeof recruitmentJobFacetCounts.$inferSelect;
export type NewRecruitmentJobFacetCount =
  typeof recruitmentJobFacetCounts.$inferInsert;
