import {
  customType,
  index,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  text,
  vector,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { contactResumes } from "./contact-resumes";
import { users } from "./users";

const tsvector = customType<{ data: string; driverData: string }>({
  dataType: () => "tsvector",
});

export const RESUME_SEARCH_EMBEDDING_DIMENSIONS = 768;

/**
 * Both inputs are plain text columns, so the expression is IMMUTABLE and safe as
 * a generated column. `to_tsvector` must keep its explicit 'english' regconfig —
 * the single-argument form is only STABLE and Postgres rejects it here.
 */
export const CONTACT_RESUME_SEARCH_VECTOR_SQL = sql`
  setweight(to_tsvector('english', coalesce("profile_text", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("resume_text", '')), 'B')
`;

/**
 * Derived search index for a parsed resume. One row per `contact_resumes` row.
 *
 * Personal identity is stripped before anything lands here — see
 * `resume-indexing/pii/resume-pii-redactor.ts`. Invalidation hard-deletes the
 * row rather than soft-deleting it, because the content is regenerable.
 *
 * `updated_at` doubles as "when this was last indexed": every write path sets it,
 * including the unchanged-hash touch that skips the embedding call.
 */
export const contactResumeSearch = prospectlySchema.table(
  "contact_resume_search",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contactResumeId: uuid("contact_resume_id")
      .notNull()
      .references(() => contactResumes.id, { onDelete: "cascade" }),
    profileText: text("profile_text"),
    resumeText: text("resume_text"),
    embedding: vector("embedding", {
      dimensions: RESUME_SEARCH_EMBEDDING_DIMENSIONS,
    }),
    embeddingModel: varchar("embedding_model", { length: 60 }),
    searchDocHash: varchar("search_doc_hash", { length: 64 }),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      CONTACT_RESUME_SEARCH_VECTOR_SQL
    ),
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
    contactResumeIdUniq: uniqueIndex("idx_contact_resume_search_resume_id").on(
      table.contactResumeId
    ),
    /**
     * Partial predicate must be mirrored by every search query, or the planner
     * falls back to a sequential scan.
     */
    searchVectorIdx: index("idx_contact_resume_search_vector")
      .using("gin", table.searchVector)
      .where(sql`deleted_at IS NULL`),
    embeddingIdx: index("idx_contact_resume_search_embedding").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  })
);

export type ContactResumeSearch = typeof contactResumeSearch.$inferSelect;
export type NewContactResumeSearch = typeof contactResumeSearch.$inferInsert;
