import {
  uuid,
  text,
  timestamp,
  boolean,
  numeric,
  bigint,
  index,
  check,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { contacts } from "./contacts";
import { bountyStages } from "./bounty-stages";
import { prospectlySchema } from "./schema-definition";

export const introductionRequests = prospectlySchema.table(
  "introduction_requests",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    requesterId: uuid("requester_id").references(() => users.id, {
      onDelete: "set null",
    }),
    contactName: varchar("contact_name", { length: 100 }).notNull(),
    bountyAmount: numeric("bounty_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),
    meetingTitle: varchar("meeting_title", { length: 255 }),
    meetingDescription: text("meeting_description").notNull(),
    additionalContext: text("additional_context"),
    status: varchar("status", { length: 30 }).default("pending"),
    contactId: bigint("contact_id", { mode: "number" }).references(
      () => contacts.id,
      { onDelete: "set null" }
    ),
    adjustedBountyAmount: numeric("adjusted_bounty_amount"),
    isMarketplaceVisible: boolean("is_marketplace_visible").default(false),
    marketplaceMovedAt: timestamp("marketplace_moved_at", {
      withTimezone: true,
    }),
    bookingToken: varchar("booking_token", { length: 100 }).unique(),
    bookingTokenExpiresAt: timestamp("booking_token_expires_at", {
      withTimezone: true,
    }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    autoExpired: boolean("auto_expired").default(false),
    bountyStagesId: uuid("bounty_stages_id").references(() => bountyStages.id, {
      onDelete: "set null",
    }),
    requesterBountyStagesId: uuid("requester_bounty_stages_id").references(
      () => bountyStages.id,
      { onDelete: "set null" }
    ),
    meetingCompletedByRequester: boolean(
      "meeting_completed_by_requester"
    ).default(false),
    requesterFeedbackCompleted: boolean("requester_feedback_completed").default(
      false
    ),
    connectorFeedbackCompleted: boolean("connector_feedback_completed").default(
      false
    ),
    acceptedBy: uuid("accepted_by").references(() => users.id, {
      onDelete: "set null",
    }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    connectorFeedbackSubmitted: boolean("connector_feedback_submitted").default(
      false
    ),
    requesterArchived: boolean("requester_archived").default(false),
    requesterArchiveReason: varchar("requester_archive_reason", {
      length: 64,
    }),
    requesterArchiveNotes: text("requester_archive_notes"),
    requesterArchivedAt: timestamp("requester_archived_at", {
      withTimezone: true,
    }),
    connectorArchived: boolean("connector_archived").default(false),
    needsRepublish: boolean("needs_republish").default(false).notNull(),
    isUrgent: boolean("is_urgent").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    statusCheck: check(
      "introduction_requests_status_check",
      sql`${table.status} IN ('pending', 'accepted', 'declined', 'intro_sent', 'meeting_scheduled', 'meeting_booked', 'meeting_rescheduled', 'meeting_completed', 'peer_feedback', 'completed', 'email_failed', 'archived')`
    ),
    meetingCompletedIdx: index(
      "idx_introduction_requests_meeting_completed"
    ).on(table.meetingCompletedByRequester),
    requesterBountyStagesIdx: index(
      "idx_introduction_requests_requester_bounty_stages_id"
    ).on(table.requesterBountyStagesId),
    requesterIdx: index("idx_introduction_requests_requester").on(
      table.requesterId
    ),
    statusIdx: index("idx_introduction_requests_status").on(table.status),
    bountyStagesIdx: index("idx_introduction_requests_bounty_stages_id").on(
      table.bountyStagesId
    ),
    acceptedByIdx: index("idx_intro_requests_accepted_by").on(table.acceptedBy),
    bookingTokenIdx: index("idx_introduction_requests_booking_token").on(
      table.bookingToken
    ),
    contactIdx: index("idx_introduction_requests_contact").on(table.contactId),
    requesterIdIdx: index("idx_introduction_requests_requester_id").on(
      table.requesterId
    ),
    requesterFeedbackIdx: index("idx_requester_feedback_completed").on(
      table.requesterId,
      table.requesterFeedbackCompleted
    ),
    connectorFeedbackIdx: index(
      "idx_introduction_requests_connector_feedback_completed"
    ).on(table.connectorFeedbackCompleted),
  })
);

export type IntroductionRequest = typeof introductionRequests.$inferSelect;
