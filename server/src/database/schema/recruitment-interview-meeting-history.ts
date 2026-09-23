import { uuid, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentInterviewMeetings } from "./recruitment-interview-meetings";

export const recruitmentInterviewMeetingHistory = prospectlySchema.table(
  "recruitment_interview_meeting_history",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => recruitmentInterviewMeetings.id, {
        onDelete: "cascade",
      }),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    previousStatus: varchar("previous_status", { length: 30 }),
    newStatus: varchar("new_status", { length: 30 }).notNull(),
    metadata: jsonb("metadata").default("{}"),
    performedBy: uuid("performed_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    meetingIdIdx: index("idx_interview_meeting_history_meeting_id").on(
      table.meetingId
    ),
    eventTypeIdx: index("idx_interview_meeting_history_event_type").on(
      table.eventType
    ),
  })
);

export type RecruitmentInterviewMeetingHistory =
  typeof recruitmentInterviewMeetingHistory.$inferSelect;
export type NewRecruitmentInterviewMeetingHistory =
  typeof recruitmentInterviewMeetingHistory.$inferInsert;
