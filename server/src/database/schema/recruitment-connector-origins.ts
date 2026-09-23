import { uuid, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentJobsSchema } from "./recruitment-jobs";
import { recruitmentJobShares } from "./recruitment-job-shares";

// Tracks which job/share brought a brand-new connector into Prospectly.
// First-click-at-signup wins: one origin row per user, created atomically
// inside the signup transaction. Drives the multi-connector payout split.
export const recruitmentConnectorOrigins = prospectlySchema.table(
  "recruitment_connector_origins",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => recruitmentJobsSchema.id, { onDelete: "cascade" }),
    shareId: uuid("share_id")
      .notNull()
      .references(() => recruitmentJobShares.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    // One origin per user — first ref wins, later ref clicks ignored
    userIdUnique: uniqueIndex("uq_recruitment_connector_origins_user_id").on(
      table.userId
    ),
    shareIdIdx: index("idx_recruitment_connector_origins_share_id").on(
      table.shareId
    ),
    jobIdIdx: index("idx_recruitment_connector_origins_job_id").on(table.jobId),
  })
);

export type RecruitmentConnectorOrigin =
  typeof recruitmentConnectorOrigins.$inferSelect;
export type NewRecruitmentConnectorOrigin =
  typeof recruitmentConnectorOrigins.$inferInsert;
