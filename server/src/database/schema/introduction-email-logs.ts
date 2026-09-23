import {
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { introductionRequests } from "./introduction-requests";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const introductionEmailLogs = prospectlySchema.table(
  "introduction_email_logs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    introductionRequestId: uuid("introduction_request_id")
      .notNull()
      .references(() => introductionRequests.id, { onDelete: "cascade" }),
    resendEmailId: varchar("resend_email_id", { length: 100 }),
    recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    emailBody: text("email_body"),
    status: varchar("status", { length: 30 }).default("pending"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    clicked: boolean("clicked").default(false),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),
    clickCount: integer("click_count").default(0),
    bounced: boolean("bounced").default(false),
    bouncedAt: timestamp("bounced_at", { withTimezone: true }),
    bounceType: varchar("bounce_type", { length: 50 }),
    bounceReason: text("bounce_reason"),
    lastEventType: varchar("last_event_type", { length: 50 }),
    lastEventAt: timestamp("last_event_at", { withTimezone: true }),
    rawEvents: jsonb("raw_events").default(sql`'[]'::jsonb`),
    connectorId: uuid("connector_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    requestIdIdx: index("idx_email_logs_request_id").on(
      table.introductionRequestId
    ),
    resendIdIdx: index("idx_email_logs_resend_id").on(table.resendEmailId),
    connectorIdIdx: index("idx_email_logs_connector_id").on(table.connectorId),
    statusIdx: index("idx_email_logs_status").on(table.status),
  })
);

export type IntroductionEmailLog = typeof introductionEmailLogs.$inferSelect;
