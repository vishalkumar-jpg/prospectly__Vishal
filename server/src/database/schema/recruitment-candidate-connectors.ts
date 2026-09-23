import {
  uuid,
  varchar,
  numeric,
  timestamp,
  index,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentJobCandidates } from "./recruitment-job-candidates";

// Normalizes candidate ↔ connector from 1-to-1 to 1-to-many so a candidate
// can be attributed to both a sharer and a claimer in the split-payout case
// (and to a single "primary" connector in the single-payout case).
// Insert-only: if a connector relationship needs to change, soft-delete and
// insert a new row — never update in place.
export const recruitmentCandidateConnectors = prospectlySchema.table(
  "recruitment_candidate_connectors",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => recruitmentJobCandidates.id, { onDelete: "cascade" }),
    connectorUserId: uuid("connector_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // 'primary' — single-connector case (direct apply, non-split consent)
    // 'claimer' — new connector who onboarded via origin job and added this candidate
    // 'sharer'  — original share-link owner who brought the claimer to Prospectly
    role: varchar("role", { length: 20 }).notNull(),
    sharePercent: numeric("share_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("100.00"),
    // Set when recruiter classifies the connector at the Hired transition.
    // 'internal' — connector is on the recruiter's payroll
    // 'external' — anyone else
    classificationType: varchar("classification_type", { length: 20 }),
    // Only meaningful when classificationType = 'internal'.
    isActiveEmployee: boolean("is_active_employee"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    candidateConnectorUnique: uniqueIndex(
      "uq_recruitment_candidate_connectors_candidate_connector"
    )
      .on(table.candidateId, table.connectorUserId)
      .where(sql`deleted_at IS NULL`),
    connectorUserIdIdx: index(
      "idx_recruitment_candidate_connectors_connector_user_id"
    ).on(table.connectorUserId),
    candidateIdIdx: index(
      "idx_recruitment_candidate_connectors_candidate_id"
    ).on(table.candidateId),
  })
);

export type RecruitmentCandidateConnector =
  typeof recruitmentCandidateConnectors.$inferSelect;
export type NewRecruitmentCandidateConnector =
  typeof recruitmentCandidateConnectors.$inferInsert;
