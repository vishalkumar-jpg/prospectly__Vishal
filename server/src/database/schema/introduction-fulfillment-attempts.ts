import { uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { introductionRequests } from "./introduction-requests";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const introductionFulfillmentAttempts = prospectlySchema.table(
  "introduction_fulfillment_attempts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    introductionRequestId: uuid("introduction_request_id").references(
      () => introductionRequests.id,
      { onDelete: "set null" }
    ),
    connectorId: uuid("connector_id").references(() => users.id, {
      onDelete: "set null",
    }),
    failureStage: varchar("failure_stage", { length: 30 }).notNull(),
    failureReason: varchar("failure_reason", { length: 50 }).notNull(),
    failureNotes: text("failure_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    requestIdx: index("idx_fulfillment_attempts_request").on(
      table.introductionRequestId
    ),
    connectorIdx: index("idx_fulfillment_attempts_connector").on(
      table.connectorId
    ),
    stageIdx: index("idx_fulfillment_attempts_stage").on(table.failureStage),
  })
);

export type IntroductionFulfillmentAttempt =
  typeof introductionFulfillmentAttempts.$inferSelect;
export type NewIntroductionFulfillmentAttempt =
  typeof introductionFulfillmentAttempts.$inferInsert;
