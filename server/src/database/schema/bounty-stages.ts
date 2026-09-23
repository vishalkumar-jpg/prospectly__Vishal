import {
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";

export const bountyStages = prospectlySchema.table("bounty_stages", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  stageId: varchar("stage_id", { length: 50 }).notNull().unique(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description").notNull(),
  percentage: integer("percentage").notNull(),
  stageOrder: integer("stage_order").notNull(),
  icon: varchar("icon", { length: 50 }).default("CheckCircle"),
  color: varchar("color", { length: 100 }).default("bg-gray-100 text-gray-800"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BountyStage = typeof bountyStages.$inferSelect;
