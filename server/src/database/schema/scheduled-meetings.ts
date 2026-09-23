import {
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { introductionRequests } from "./introduction-requests";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const scheduledMeetings = prospectlySchema.table(
  "scheduled_meetings",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    introductionRequestId: uuid("introduction_request_id")
      .notNull()
      .references(() => introductionRequests.id, { onDelete: "cascade" }),
    requesterId: uuid("requester_id").references(() => users.id, {
      onDelete: "set null",
    }),
    prospectEmail: varchar("prospect_email", { length: 255 }).notNull(),
    prospectName: varchar("prospect_name", { length: 100 }),
    meetingDate: timestamp("meeting_date", { withTimezone: true }).notNull(),
    meetingDuration: integer("meeting_duration").notNull().default(30),
    meetingPlatform: varchar("meeting_platform", { length: 30 }).default(
      "google_meet"
    ),
    meetingLink: text("meeting_link"),
    calendarEventId: varchar("calendar_event_id", { length: 255 }),
    calendarProvider: varchar("calendar_provider", { length: 30 }),
    status: varchar("status", { length: 30 }).default("scheduled"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    introRequestIdx: index("idx_scheduled_meetings_intro_request").on(
      table.introductionRequestId
    ),
    requesterIdx: index("idx_scheduled_meetings_requester").on(
      table.requesterId
    ),
    statusIdx: index("idx_scheduled_meetings_status").on(table.status),
    meetingDateIdx: index("idx_scheduled_meetings_date").on(table.meetingDate),
  })
);

export const meetingStatusUpdates = prospectlySchema.table(
  "meeting_status_updates",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    scheduledMeetingId: uuid("scheduled_meeting_id")
      .notNull()
      .references(() => scheduledMeetings.id, { onDelete: "cascade" }),
    previousStatus: varchar("previous_status", { length: 30 }),
    newStatus: varchar("new_status", { length: 30 }).notNull(),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow(),
  }
);

export type ScheduledMeeting = typeof scheduledMeetings.$inferSelect;
export type MeetingStatusUpdate = typeof meetingStatusUpdates.$inferSelect;
