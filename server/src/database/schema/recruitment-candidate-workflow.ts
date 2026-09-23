import {
  uuid,
  varchar,
  boolean,
  text,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentJobCandidates } from "./recruitment-job-candidates";

export const recruitmentCandidateWorkflow = prospectlySchema.table(
  "recruitment_candidate_workflow",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => recruitmentJobCandidates.id, { onDelete: "cascade" }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionCategory: varchar("rejection_category", { length: 100 }),
    rejectionNote: varchar("rejection_note", { length: 500 }),
    requesterShortlisted: boolean("requester_shortlisted"),
    requesterShortlistedAt: timestamp("requester_shortlisted_at", {
      withTimezone: true,
    }),
    interviewScheduledAt: timestamp("interview_scheduled_at", {
      withTimezone: true,
    }),
    interviewMeetingLink: varchar("interview_meeting_link", { length: 500 }),
    interviewNotes: text("interview_notes"),
    interviewBookingToken: varchar("interview_booking_token", { length: 500 }),
    interviewBookingTokenExpiresAt: timestamp(
      "interview_booking_token_expires_at",
      { withTimezone: true }
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
    candidateIdIdx: index("idx_recruitment_candidate_workflow_candidate_id").on(
      table.candidateId
    ),
    uniqueCandidateWorkflow: unique(
      "unique_recruitment_candidate_workflow_candidate"
    ).on(table.candidateId),
  })
);

export type RecruitmentCandidateWorkflow =
  typeof recruitmentCandidateWorkflow.$inferSelect;
export type NewRecruitmentCandidateWorkflow =
  typeof recruitmentCandidateWorkflow.$inferInsert;
