import {
  bigint,
  index,
  jsonb,
  numeric,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { mediaSchema } from "./media.schema";
import { recruitmentJobCandidates } from "./recruitment-job-candidates";
import { contacts } from "./contacts";
import { users } from "./users";

export const contactResumes = prospectlySchema.table(
  "contact_resumes",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => mediaSchema.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id").references(
      () => recruitmentJobCandidates.id,
      { onDelete: "set null" }
    ),
    contactId: bigint("contact_id", { mode: "number" }).references(
      () => contacts.id,
      { onDelete: "set null" }
    ),
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    jobTitle: varchar("job_title", { length: 255 }),
    skills: jsonb("skills"),
    totalYearsExp: numeric("total_years_exp", { precision: 4, scale: 1 }),
    educationLevel: varchar("education_level", { length: 20 }),
    aiSummary: text("ai_summary"),
    metadata: jsonb("metadata"),
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
    mediaIdUniq: uniqueIndex("idx_contact_resumes_media_id").on(table.mediaId),
    candidateIdIdx: index("idx_contact_resumes_candidate_id").on(
      table.candidateId
    ),
    contactIdIdx: index("idx_contact_resumes_contact_id").on(table.contactId),
    uploadedByIdx: index("idx_contact_resumes_uploaded_by").on(
      table.uploadedBy
    ),
    educationLevelIdx: index("idx_contact_resumes_education_level")
      .on(table.educationLevel)
      .where(sql`${table.deletedAt} IS NULL`),
  })
);

export type ContactResume = typeof contactResumes.$inferSelect;
export type NewContactResume = typeof contactResumes.$inferInsert;
