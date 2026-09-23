import {
  uuid,
  varchar,
  timestamp,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { introductionRequests } from "./introduction-requests";

export const introductionRequestPricesSchema = prospectlySchema.table(
  "introduction_request_prices",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    introductionRequestId: uuid("introduction_request_id")
      .notNull()
      .references(() => introductionRequests.id, { onDelete: "cascade" }),
    bountyAmount: numeric("bounty_amount", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    providerFee: numeric("provider_fee", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    processingFee: numeric("processing_fee", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    currency: varchar("currency", { length: 10 }).default("USD"),
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
    uniqueIntroductionRequestIdIdx: uniqueIndex(
      "idx_introduction_request_prices_introduction_request_id"
    ).on(table.introductionRequestId),
  })
);

export type IntroductionRequestPrices =
  typeof introductionRequestPricesSchema.$inferSelect;
export type NewIntroductionRequestPrices =
  typeof introductionRequestPricesSchema.$inferInsert;
