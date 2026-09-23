import {
  uuid,
  timestamp,
  varchar,
  bigint,
  index,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contacts } from "./contacts";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const contactEnrichments = prospectlySchema.table(
  "contact_enrichments",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .default(sql`nextval('contact_enrichments_id_seq')`),
    contactId: bigint("contact_id", { mode: "number" })
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    enrichmentStatus: varchar("enrichment_status", { length: 30 })
      .notNull()
      .default("pending"),
    enrichmentRequestId: uuid("enrichment_request_id"),
    enrichedAt: timestamp("enriched_at"),
    enrichmentResponse: jsonb("enrichment_response"),
    enrichmentSource: varchar("enrichment_source", { length: 50 }).default(
      "clay"
    ),
    externalPersonId: varchar("external_person_id", { length: 100 }),
    enrichedBy: uuid("enriched_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    contactIdIdx: index("idx_contact_enrichments_contact_id").on(
      table.contactId
    ),
    enrichmentRequestIdIdx: index(
      "idx_contact_enrichments_enrichment_request_id"
    ).on(table.enrichmentRequestId),
    enrichmentStatusIdx: index("idx_contact_enrichments_enrichment_status").on(
      table.enrichmentStatus
    ),
    externalPersonIdIdx: index("idx_contact_enrichments_external_person_id").on(
      table.externalPersonId
    ),
    metricsIdx: index("idx_contact_enrichments_metrics").on(
      table.enrichedBy,
      table.enrichmentStatus,
      table.enrichmentSource
    ),
    contactIdUnique: unique("uniq_contact_enrichments_contact_id").on(
      table.contactId
    ),
  })
);

export type ContactEnrichment = typeof contactEnrichments.$inferSelect;
