import {
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  index,
  vector,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { industriesSchema } from "./industries.schema";
import { departmentsSchema } from "./departments.schema";

/**
 * The employment-type vocabulary, shared by the server DTO and the client's
 * wizard control. Lives on the schema module because that directory is the one
 * import path both sides can reach (`@shared/*` on the client).
 */
export const RECRUITMENT_EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "internship",
  "freelance",
] as const;

export type RecruitmentEmploymentType =
  (typeof RECRUITMENT_EMPLOYMENT_TYPES)[number];

/** Sentence-case labels for the wizard select and the search facet. */
export const RECRUITMENT_EMPLOYMENT_TYPE_LABELS: Record<
  RecruitmentEmploymentType,
  string
> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  temporary: "Temporary",
  internship: "Internship",
  freelance: "Freelance",
};

export const recruitmentJobsSchema = prospectlySchema.table(
  "recruitment_jobs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id),
    industryId: integer("industry_id").references(() => industriesSchema.id),
    departmentId: integer("department_id").references(
      () => departmentsSchema.id
    ),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    companyName: varchar("company_name", { length: 255 }).notNull(),
    experienceLevel: varchar("experience_level", { length: 50 }),
    workType: varchar("work_type", { length: 50 }),
    employmentType: varchar("employment_type", { length: 20 }),
    location: varchar("location", { length: 255 }),
    /** ISO 3166-1 alpha-2 country codes for the job location (multi-select). */
    countries: jsonb("countries")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    requiredSkills: jsonb("required_skills"),
    preferredSkills: jsonb("preferred_skills"),
    requirements: text("requirements"),
    responsibilities: text("responsibilities"),
    benefits: text("benefits"),
    status: varchar("status", { length: 50 }).default("draft"),
    aiGenerated: boolean("ai_generated").default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedReason: varchar("closed_reason", { length: 500 }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    creationMethod: varchar("creation_method", { length: 20 }).default(
      "manual"
    ),
    sourceUrl: text("source_url"),
    companyWebsite: varchar("company_website", { length: 500 }),
    probationPeriodDays: integer("probation_period_days"),
    embedding: vector("embedding", { dimensions: 768 }),
  },
  (table) => ({
    requesterIdIdx: index("idx_recruitment_jobs_requester_id").on(
      table.requesterId
    ),
    statusIdx: index("idx_recruitment_jobs_status").on(table.status),
    industryIdIdx: index("idx_recruitment_jobs_industry_id").on(
      table.industryId
    ),
    departmentIdIdx: index("idx_recruitment_jobs_department_id").on(
      table.departmentId
    ),
    requesterStatusIdx: index("idx_recruitment_jobs_requester_status").on(
      table.requesterId,
      table.status
    ),
  })
);

export type RecruitmentJob = typeof recruitmentJobsSchema.$inferSelect;
