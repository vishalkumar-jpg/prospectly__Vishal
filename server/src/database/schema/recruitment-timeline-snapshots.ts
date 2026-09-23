import { uuid, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

/** Per-job numeric metrics stored for heatmap “up since last ack” arrows. */
export type RecruitmentTimelineJobSnapshotMetrics = {
  connectorCount: number;
  totalCandidateCount: number;
  candidateCount: number;
  pendingConsentCandidateCount: number;
  qualifiedCount: number;
  totalQualifiedCount: number;
  notQualifiedCount: number;
  notQualifiedLowScoreCount: number;
  notQualifiedAssessmentCount: number;
  screenedCount: number;
  totalScreenedCount: number;
  interviewsCount: number;
  totalInterviewsCount: number;
  hiredCount: number;
  totalHiredCount: number;
  emailsSent: number;
  emailsDelivered: number;
  emailsBounced: number;
  uploadsCompleted: number;
  uploadsFailed: number;
  viewCount: number;
  totalCapturedSpend: number;
  pendingPayoutCount: number;
};

export type RecruitmentTimelineJobSnapshotEntry = {
  acknowledgedAt: string;
  metrics: RecruitmentTimelineJobSnapshotMetrics;
};

export type RecruitmentTimelineSnapshotPayload = {
  version: 1;
  bootstrappedAt: string;
  updatedAt: string;
  jobs: Record<string, RecruitmentTimelineJobSnapshotEntry>;
};

export const recruitmentTimelineSnapshots = prospectlySchema.table(
  "recruitment_timeline_snapshots",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    /** Always set explicitly on insert — no DB default (keeps payload type valid). */
    snapshot: jsonb("snapshot")
      .$type<RecruitmentTimelineSnapshotPayload>()
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
  }
);

export type RecruitmentTimelineSnapshot =
  typeof recruitmentTimelineSnapshots.$inferSelect;
export type NewRecruitmentTimelineSnapshot =
  typeof recruitmentTimelineSnapshots.$inferInsert;
