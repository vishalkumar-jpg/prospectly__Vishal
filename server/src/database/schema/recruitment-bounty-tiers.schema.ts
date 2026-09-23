import {
  serial,
  numeric,
  boolean,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { prospectlySchema } from "./schema-definition";

export const recruitmentBountyTiersSchema = prospectlySchema.table(
  "recruitment_bounty_tiers",
  {
    id: serial("id").primaryKey(),
    salaryMin: numeric("salary_min", {
      precision: 12,
      scale: 2,
    }).notNull(),
    salaryMax: numeric("salary_max", {
      precision: 12,
      scale: 2,
    }).notNull(),
    salaryPeriod: varchar("salary_period", { length: 20 })
      .default("yearly")
      .notNull(),
    bountyAmount: numeric("bounty_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  }
);

export type RecruitmentBountyTier =
  typeof recruitmentBountyTiersSchema.$inferSelect;
