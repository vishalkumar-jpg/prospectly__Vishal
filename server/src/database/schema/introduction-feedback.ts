import {
  uuid,
  text,
  timestamp,
  boolean,
  numeric,
  unique,
  index,
  check,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { introductionRequests } from "./introduction-requests";
import { prospectlySchema } from "./schema-definition";

export const introductionFeedback = prospectlySchema.table(
  "introduction_feedback",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    introductionId: uuid("introduction_id").references(
      () => introductionRequests.id,
      { onDelete: "set null" }
    ),
    feedbackFromUserId: uuid("feedback_from_user_id").references(
      () => users.id,
      { onDelete: "set null" }
    ),
    feedbackToUserId: uuid("feedback_to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    rating: numeric("rating", { precision: 3, scale: 1 }).notNull(),
    feedbackText: text("feedback_text"),
    feedbackCategory: varchar("feedback_category", { length: 50 })
      .notNull()
      .default("general"),
    rejectionReason: text("rejection_reason"),
    meetingCompleted: boolean("meeting_completed").notNull().default(true),
    feedbackType: varchar("feedback_type", { length: 30 }).default(
      "meeting_feedback"
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueFeedback: unique().on(
      table.introductionId,
      table.feedbackFromUserId,
      table.feedbackType
    ),
    introductionIdIdx: index("idx_introduction_feedback_introduction_id").on(
      table.introductionId
    ),
    usersIdx: index("idx_introduction_feedback_users").on(
      table.feedbackFromUserId,
      table.feedbackToUserId
    ),
    createdAtIdx: index("idx_introduction_feedback_created_at").on(
      table.createdAt
    ),
    feedbackTypeIdx: index("idx_introduction_feedback_type").on(
      table.feedbackType
    ),
    userTypeIdx: index("idx_introduction_feedback_user_type").on(
      table.introductionId,
      table.feedbackFromUserId,
      table.feedbackType
    ),
    meetingCompletedIdx: index(
      "idx_introduction_feedback_meeting_completed"
    ).on(table.meetingCompleted),
    ratingRangeCheck: check(
      "introduction_feedback_rating_check",
      sql`${table.rating} >= 0.5 AND ${table.rating} <= 5`
    ),
    validRatingIncrements: check(
      "valid_rating_range",
      sql`${table.rating} >= 0.5 AND ${table.rating} <= 5.0 AND (${table.rating} * 2) = FLOOR(${table.rating} * 2)`
    ),
    feedbackTypeCheck: check(
      "introduction_feedback_feedback_type_check",
      sql`${table.feedbackType} IN ('meeting_feedback', 'peer_feedback')`
    ),
  })
);

export type IntroductionFeedback = typeof introductionFeedback.$inferSelect;
