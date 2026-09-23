import {
  uuid,
  timestamp,
  varchar,
  bigint,
  numeric,
  index,
  text,
  jsonb,
  vector,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { queueEnrichments } from "./queue-enrichments";
import { prospectlySchema } from "./schema-definition";

export const contacts = prospectlySchema.table(
  "contacts",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .default(sql`nextval('contacts_id_seq')`),
    firstName: varchar("first_name", { length: 50 }),
    lastName: varchar("last_name", { length: 50 }),
    gender: varchar("gender", { length: 20 }),
    title: varchar("title", { length: 100 }),
    company: varchar("company", { length: 150 }),
    phoneNumber: varchar("phone_number", { length: 30 }),
    email: varchar("email", { length: 255 }),
    employees: varchar("employees", { length: 100 }),
    industry: varchar("industry", { length: 100 }),
    linkedin: varchar("linkedin", { length: 255 }),
    website: varchar("website", { length: 255 }),
    city: varchar("city", { length: 50 }),
    state: varchar("state", { length: 50 }),
    country: varchar("country", { length: 60 }),
    companyDomain: varchar("company_domain", { length: 255 }),
    companyIndustry: varchar("company_industry", { length: 100 }),
    companyDescription: text("company_description"),
    companyType: varchar("company_type", { length: 100 }),
    location: varchar("location", { length: 255 }),
    companyLinkedinUrl: varchar("company_linkedin_url", { length: 255 }),
    corporatePhoneNumber: varchar("corporate_phone_number", { length: 30 }),
    profilePhotoUrl: text("profile_photo_url"),
    linkedinConnections: varchar("linkedin_connections", { length: 20 }),
    skills: jsonb("skills"),
    source: varchar("source", { length: 30 }).default("manual"),
    // The user who FIRST imported this contact (original creator/importer)
    // Note: Multiple users can access this contact via contact_relationships table
    originalImporterId: uuid("original_importer_id").references(
      () => users.id,
      { onDelete: "set null" }
    ),
    bountyAmount: numeric("bounty_amount").default("0"),
    // References queue_enrichments.id - set when contact is created via Clay.com enrichment
    enrichmentId: uuid("enrichment_id").references(() => queueEnrichments.id, {
      onDelete: "set null",
    }),
    embedding: vector("embedding", { dimensions: 768 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
    isTypesenseSynced: boolean("is_typesense_synced").default(false).notNull(),
  },
  (table) => ({
    emailIdx: index("idx_contacts_email").on(table.email),
    phoneNumberIdx: index("idx_contacts_phone_number").on(table.phoneNumber),
    linkedinIdx: index("idx_contacts_linkedin").on(table.linkedin),
    sourceIdx: index("idx_contacts_source").on(table.source),
    originalImporterIdIdx: index("idx_contacts_original_importer_id").on(
      table.originalImporterId
    ),
    enrichmentIdIdx: index("idx_contacts_enrichment_id").on(table.enrichmentId),
    embeddingIdx: index("idx_contacts_embedding").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
    typesenseUnsyncedIdx: index("idx_contacts_typesense_unsynced")
      .on(table.id)
      .where(sql`is_typesense_synced = false AND deleted_at IS NULL`),
    /**
     * Partial index for live rows sorted newest-first (matches default list).
     * In production on large tables, create with CREATE INDEX CONCURRENTLY (not inside a transaction).
     */
    activeIdDescIdx: index("idx_contacts_active_id_desc").on(table.id.desc()),

    /**
     * pg_trgm GIN indexes for admin contact search (`ILIKE '%term%'` on first/last/linkedIn + computed full name).
     * Requires: `CREATE EXTENSION IF NOT EXISTS pg_trgm;` on the database once.
     * Partial `WHERE deleted_at IS NULL` keeps indexes smaller (live rows only).
     */
    searchFirstNameTrgmIdx: index(
      "idx_contacts_search_first_name_gin_trgm"
    ).using("gin", table.firstName.op("gin_trgm_ops")),
    searchLastNameTrgmIdx: index(
      "idx_contacts_search_last_name_gin_trgm"
    ).using("gin", table.lastName.op("gin_trgm_ops")),
    searchLinkedinTrgmIdx: index("idx_contacts_search_linkedin_gin_trgm").using(
      "gin",
      table.linkedin.op("gin_trgm_ops")
    ),
    /**
     * Full-name trgm: `coalesce` + `||` only — `trim`, `concat_ws`, etc. are not IMMUTABLE
     * in all PG versions, which index expressions require.
     */
    searchDisplayFullNameTrgmIdx: index(
      "idx_contacts_search_display_full_name_gin_trgm"
    ).using(
      "gin",
      sql`(coalesce(${table.firstName}, '') || ' ' || coalesce(${table.lastName}, ''))`.append(
        sql.raw(" gin_trgm_ops")
      )
    ),
    /**
     * Partial index for contacts with LinkedIn but no email or phone.
     * Useful for identifying candidates that need contact info enrichment.
     */
    contactsWithLinkedinIdx: index("idx_contacts_with_linkedin")
      .on(table.id)
      .where(
        sql`linkedin IS NOT NULL AND btrim(linkedin::text) <> '' AND email IS NULL AND phone_number IS NULL`
      ),
  })
);

export type Contact = typeof contacts.$inferSelect;
