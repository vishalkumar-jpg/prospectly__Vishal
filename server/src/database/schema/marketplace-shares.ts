import {
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { introductionRequests } from "./introduction-requests";
import { prospectlySchema } from "./schema-definition";

export const marketplaceShares = prospectlySchema.table(
  "marketplace_shares",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    introductionRequestId: uuid("introduction_request_id")
      .notNull()
      .references(() => introductionRequests.id, { onDelete: "cascade" }),
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
    requestIdx: index("idx_marketplace_shares_request").on(
      table.introductionRequestId
    ),
    sharerIdx: index("idx_marketplace_shares_sharer").on(table.sharerId),
    sharerCodeIdx: index("idx_marketplace_shares_sharer_code").on(
      table.sharerCode
    ),
    platformIdx: index("idx_marketplace_shares_platform").on(table.platform),
    // Unique constraint: one share per (request, user, platform) combination
    requestSharerPlatformUnique: uniqueIndex(
      "idx_marketplace_shares_request_sharer_platform_unique"
    ).on(table.introductionRequestId, table.sharerId, table.platform),
  })
);

export type MarketplaceShare = typeof marketplaceShares.$inferSelect;
export type NewMarketplaceShare = typeof marketplaceShares.$inferInsert;
