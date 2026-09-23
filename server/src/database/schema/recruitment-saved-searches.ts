import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";

/** How the criteria were originally assembled — display only. */
export const SAVED_SEARCH_SOURCES = ["advanced", "job_description"] as const;
export type SavedSearchSource = (typeof SAVED_SEARCH_SOURCES)[number];

/** Bumped when the stored criteria shape changes, so a migration can find old rows. */
export const SAVED_SEARCH_CRITERIA_VERSION = 1;

/**
 * A recruiter's stored candidate search.
 *
 * Personal, not shared: a search is a working note about how someone hunts, and
 * sharing raises questions about whose scope it runs in that nothing here answers.
 *
 * `criteria` stores the **derived criteria, never a job description document** —
 * a rerun re-filters against live data rather than re-extracting, so it costs
 * nothing and cannot bill twice.
 */
export const recruitmentSavedSearches = prospectlySchema.table(
  "recruitment_saved_searches",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 60 }).notNull(),

    /**
     * Versioned criteria. Untrusted on read: a stored search may predate a facet
     * rename, so every read runs it through the same normaliser as an inbound
     * request and drops unknown keys rather than throwing. A stale saved search
     * must degrade, never 500.
     */
    criteria: jsonb("criteria").notNull(),
    criteriaVersion: smallint("criteria_version")
      .notNull()
      .default(SAVED_SEARCH_CRITERIA_VERSION),

    source: varchar("source", { length: 20 }).notNull().default("advanced"),

    /** What it returned when saved. Display only — a rerun always recounts. */
    resultCountAtSave: integer("result_count_at_save"),
    /** Drives "recently used" ordering, distinct from when it was last edited. */
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    /** Pins a search to the top of the list. */
    isFavorite: boolean("is_favorite").notNull().default(false),

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
    /**
     * Partial and case-insensitive: two searches called "Senior Accountant" and
     * "senior accountant" are the same name to a person, and the predicate means
     * deleting one frees its title for reuse.
     */
    userTitleUniq: uniqueIndex("uniq_saved_search_user_title")
      .on(table.userId, sql`lower(${table.title})`)
      .where(sql`${table.deletedAt} IS NULL`),
    userRecentIdx: index("idx_saved_search_user_recent").on(
      table.userId,
      table.updatedAt.desc()
    ),
  })
);

export type RecruitmentSavedSearch =
  typeof recruitmentSavedSearches.$inferSelect;
export type NewRecruitmentSavedSearch =
  typeof recruitmentSavedSearches.$inferInsert;
