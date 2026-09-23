import {
  text,
  timestamp,
  boolean,
  numeric,
  integer,
  index,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import { prospectlySchema } from "./schema-definition";

export const actionTypeEnum = prospectlySchema.enum("trust_score_action_type", [
  "ADD",
  "SUBTRACT",
  "SET",
]);

export const trustScoreRules = prospectlySchema.table(
  "trust_score_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    actionType: actionTypeEnum("action_type").notNull(),
    points: numeric("points", { precision: 4, scale: 1 }).notNull(),
    isActive: boolean("is_active").default(true),
    isConfigurable: boolean("is_configurable").default(false),
    configParams: jsonb("config_params"),
    triggerEvent: text("trigger_event").notNull(),
    priority: integer("priority").default(0),
    conditions: jsonb("conditions"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    slugIdx: index("idx_trust_score_rules_slug").on(table.slug),
    triggerEventIdx: index("idx_trust_score_rules_trigger_event").on(
      table.triggerEvent
    ),
    activeIdx: index("idx_trust_score_rules_active").on(
      table.isActive,
      table.deletedAt
    ),
  })
);

export type TrustScoreRule = typeof trustScoreRules.$inferSelect;
