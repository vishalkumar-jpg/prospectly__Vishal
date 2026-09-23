import { timestamp, varchar, bigint, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contactRelationships } from "./contact-relationships";
import { prospectlySchema } from "./schema-definition";

export const contactImportSnapshots = prospectlySchema.table(
  "contact_import_snapshots",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .default(sql`nextval('contact_import_snapshots_id_seq')`),
    relationshipId: bigint("relationship_id", { mode: "number" })
      .notNull()
      .references(() => contactRelationships.id, { onDelete: "cascade" }),
    sourceType: varchar("source_type", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueRelationshipSourceType: unique("unique_relationship_source_type").on(
      table.relationshipId,
      table.sourceType
    ),
  })
);

export type ContactImportSnapshot = typeof contactImportSnapshots.$inferSelect;
