import {
  uuid,
  varchar,
  timestamp,
  text,
  bigserial,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { marketplaceShares } from "./marketplace-shares";
import { prospectlySchema } from "./schema-definition";

export const marketplaceShareEvents = prospectlySchema.table(
  "marketplace_share_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    shareId: uuid("share_id")
      .notNull()
      .references(() => marketplaceShares.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 30 }).notNull(),
    ipHash: varchar("ip_hash", { length: 64 }),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    shareIdx: index("idx_marketplace_share_events_share").on(table.shareId),
    eventTypeIdx: index("idx_marketplace_share_events_type").on(
      table.eventType
    ),
    createdAtIdx: index("idx_marketplace_share_events_created").on(
      table.createdAt
    ),
    ipHashIdx: index("idx_marketplace_share_events_ip").on(table.ipHash),
    // Unique constraint: one event per (shareId, eventType, ipHash) combination
    // This prevents duplicate events for the same IP, share, and event type
    shareEventIpUnique: uniqueIndex(
      "idx_marketplace_share_events_share_event_ip_unique"
    ).on(table.shareId, table.eventType, table.ipHash),
  })
);

export type MarketplaceShareEvent = typeof marketplaceShareEvents.$inferSelect;
export type NewMarketplaceShareEvent =
  typeof marketplaceShareEvents.$inferInsert;
