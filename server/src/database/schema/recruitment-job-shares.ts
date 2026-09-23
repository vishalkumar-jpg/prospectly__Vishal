import {
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { recruitmentJobsSchema } from "./recruitment-jobs";
import { prospectlySchema } from "./schema-definition";

export const recruitmentJobShares = prospectlySchema.table(
  "recruitment_job_shares",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: uuid("job_id")
      .notNull()
      .references(() => recruitmentJobsSchema.id, { onDelete: "cascade" }),
    sharerId: uuid("sharer_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sharerCode: varchar("sharer_code", { length: 50 }).notNull().unique(),
    platform: varchar("platform", { length: 30 }).notNull(),
    utmSource: varchar("utm_source", { length: 100 }),
    utmMedium: varchar("utm_medium", { length: 100 }),
    utmCampaign: varchar("utm_campaign", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    jobIdx: index("idx_recruitment_job_shares_job").on(table.jobId),
    sharerIdx: index("idx_recruitment_job_shares_sharer").on(table.sharerId),
    sharerCodeIdx: index("idx_recruitment_job_shares_sharer_code").on(
      table.sharerCode
    ),
    platformIdx: index("idx_recruitment_job_shares_platform").on(
      table.platform
    ),
    jobSharerPlatformUnique: uniqueIndex(
      "idx_recruitment_job_shares_job_sharer_platform_unique"
    ).on(table.jobId, table.sharerId, table.platform),
  })
);

export type RecruitmentJobShare = typeof recruitmentJobShares.$inferSelect;
export type NewRecruitmentJobShare = typeof recruitmentJobShares.$inferInsert;
