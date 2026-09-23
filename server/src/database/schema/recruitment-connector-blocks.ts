import {
  uuid,
  varchar,
  timestamp,
  bigint,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { contacts } from "./contacts";

/**
 * Permanent candidate→connector blocks.
 * Written when a candidate declines consent with "I don't know this connector".
 * `reason` stores optional free-text description (defaults to the option label).
 */
export const recruitmentConnectorBlocks = prospectlySchema.table(
  "recruitment_connector_blocks",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    candidateEmailHash: varchar("candidate_email_hash", {
      length: 64,
    }).notNull(),
    connectorUserId: uuid("connector_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contactId: bigint("contact_id", { mode: "number" }).references(
      () => contacts.id,
      { onDelete: "set null" }
    ),
    /** Optional description from the candidate; defaults to the decline option label. */
    reason: varchar("reason", { length: 500 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
  },
  (table) => ({
    uniqueEmailConnector: unique(
      "unique_recruitment_connector_block_email_connector"
    ).on(table.candidateEmailHash, table.connectorUserId),
    connectorIdx: index("idx_recruitment_connector_blocks_connector").on(
      table.connectorUserId
    ),
    emailHashIdx: index("idx_recruitment_connector_blocks_email_hash").on(
      table.candidateEmailHash
    ),
  })
);

export type RecruitmentConnectorBlock =
  typeof recruitmentConnectorBlocks.$inferSelect;
export type NewRecruitmentConnectorBlock =
  typeof recruitmentConnectorBlocks.$inferInsert;
