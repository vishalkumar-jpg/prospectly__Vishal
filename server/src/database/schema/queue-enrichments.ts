import {
  uuid,
  timestamp,
  varchar,
  text,
  integer,
  jsonb,
  bigint,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { contacts } from "./contacts";
import { prospectlySchema } from "./schema-definition";

export const enrichmentStatusEnum = prospectlySchema.enum("enrichment_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "insufficient_data",
]);

export const queueEnrichments = prospectlySchema.table("queue_enrichments", {
  id: uuid("id").primaryKey().defaultRandom(),
  searchQuery: jsonb("search_query").notNull(), // {name, company, linkedin_url}
  queryHash: varchar("query_hash", { length: 255 }).notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: enrichmentStatusEnum("status").default("pending"),
  enrichedContactId: bigint("enriched_contact_id", {
    mode: "number",
  }).references(() => contacts.id),
  webhookResponse: jsonb("webhook_response"), // Store raw Clay response
  errorMessage: text("error_message"),
  attempts: integer("attempts").default(0),
  enrichmentSource: varchar("enrichment_source", { length: 50 }).default(
    "clay"
  ),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type QueueEnrichment = typeof queueEnrichments.$inferSelect;
export type NewQueueEnrichment = typeof queueEnrichments.$inferInsert;
