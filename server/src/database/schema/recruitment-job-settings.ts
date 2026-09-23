import {
  uuid,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentJobsSchema } from "./recruitment-jobs";

export const recruitmentJobSettingsSchema = prospectlySchema.table(
  "recruitment_job_settings",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: uuid("job_id")
      .notNull()
      .references(() => recruitmentJobsSchema.id, { onDelete: "cascade" }),
    notifyOnCreate: boolean("notify_on_create").default(false).notNull(),
    organisationIds: jsonb("organisation_ids").$type<string[]>(),
    hasAssessment: boolean("has_assessment").default(false).notNull(),
    notificationSnapshot: jsonb("notification_snapshot").$type<{
      lastClose?: {
        sendNotifications: boolean;
        candidateStageKeys: string[];
      };
      lastReopen?: {
        sendNotifications: boolean;
        candidateStageKeys: string[];
      };
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
  (table) => ({
    uniqueJobIdIdx: uniqueIndex("idx_recruitment_job_settings_job_id")
      .on(table.jobId)
      .where(sql`${table.deletedAt} IS NULL`),
  })
);

export type RecruitmentJobSettings =
  typeof recruitmentJobSettingsSchema.$inferSelect;
export type NewRecruitmentJobSettings =
  typeof recruitmentJobSettingsSchema.$inferInsert;
