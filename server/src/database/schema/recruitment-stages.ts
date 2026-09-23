import {
  serial,
  varchar,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { prospectlySchema } from "./schema-definition";

export const recruitmentStagesSchema = prospectlySchema.table(
  "recruitment_stages",
  {
    id: serial("id").primaryKey(),
    stageKey: varchar("stage_key", { length: 50 }).notNull().unique(),
    label: varchar("label", { length: 100 }).notNull(),
    stageOrder: integer("stage_order").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  }
);

export type RecruitmentStage = typeof recruitmentStagesSchema.$inferSelect;
