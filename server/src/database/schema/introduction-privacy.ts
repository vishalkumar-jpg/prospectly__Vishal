import { uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { introductionRequests } from "./introduction-requests";
import { prospectlySchema } from "./schema-definition";

export const introductionPrivacy = prospectlySchema.table(
  "introduction_privacy",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    introductionRequestId: uuid("introduction_request_id")
      .notNull()
      .references(() => introductionRequests.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 255 }).notNull(),
    reason: varchar("reason", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    requestIdIdx: index("idx_introduction_privacy_request_id").on(
      table.introductionRequestId
    ),
  })
);

export type IntroductionPrivacy = typeof introductionPrivacy.$inferSelect;
