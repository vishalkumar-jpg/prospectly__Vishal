import {
  uuid,
  text,
  timestamp,
  integer,
  varchar,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentJobCandidates } from "./recruitment-job-candidates";
import { recruitmentJobsSchema } from "./recruitment-jobs";

export const recruitmentInterviewMeetings = prospectlySchema.table(
  "recruitment_interview_meetings",
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
    candidateUserId: uuid("candidate_user_id")
      .notNull()
      .references(() => users.id),
    meetingDate: timestamp("meeting_date", { withTimezone: true }),
    meetingDuration: integer("meeting_duration").default(30),
    meetingPlatform: varchar("meeting_platform", { length: 30 }),
    meetingLink: text("meeting_link"),
    calendarEventId: varchar("calendar_event_id", { length: 255 }),
    calendarProvider: varchar("calendar_provider", { length: 30 }),
    status: varchar("status", { length: 30 }).default("invite_sent").notNull(),
    interviewNotes: text("interview_notes"),
    interviewOutcome: varchar("interview_outcome", { length: 30 }),
    interviewOutcomeComment: text("interview_outcome_comment"),
    interviewOutcomeMarkedAt: timestamp("interview_outcome_marked_at", {
      withTimezone: true,
    }),
    interviewOutcomeMarkedBy: uuid("interview_outcome_marked_by").references(
      () => users.id
    ),
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
    candidateIdIdx: index("idx_interview_meeting_candidate_id").on(
      table.candidateId
    ),
    jobIdIdx: index("idx_interview_meeting_job_id").on(table.jobId),
    recruiterIdIdx: index("idx_interview_meeting_recruiter_id").on(
      table.recruiterId
    ),
    statusIdx: index("idx_interview_meeting_status").on(table.status),
  })
);

export type RecruitmentInterviewMeeting =
  typeof recruitmentInterviewMeetings.$inferSelect;
export type NewRecruitmentInterviewMeeting =
  typeof recruitmentInterviewMeetings.$inferInsert;
