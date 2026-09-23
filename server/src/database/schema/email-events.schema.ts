import { uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { AnyType } from "types/common";
import { userInvites } from "./user-invites.schema";
import { prospectlySchema } from "./schema-definition";

export const emailEventsSchema = prospectlySchema.table(
  "email_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resendEmailId: text("resend_email_id").notNull(),
    inviteId: uuid("invite_id").references(() => userInvites.id, {
      onDelete: "cascade",
    }),
    eventType: text("event_type").notNull(), // "sent", "delivered", "opened", "clicked", "bounced", "complained"
    recipientEmail: text("recipient_email").notNull(),
    subject: text("subject"),
    metadata: jsonb("metadata").$type<Record<string, AnyType>>(),
    occurredAt: timestamp("occurred_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    resendIdIdx: index("idx_email_events_resend_id").on(table.resendEmailId),
    inviteIdIdx: index("idx_email_events_invite_id").on(table.inviteId),
    eventTypeIdx: index("idx_email_events_type").on(table.eventType),
    occurredAtIdx: index("idx_email_events_occurred_at").on(table.occurredAt),
  })
);
