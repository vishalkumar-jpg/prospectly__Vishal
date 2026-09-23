import {
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { prospectlySchema } from "./schema-definition";

export const referralConfigurationSchema = prospectlySchema.table(
  "referral_configuration",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").unique().notNull(),
    value: jsonb("value").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    keyIdx: index("idx_referral_configuration_key").on(table.key),
    isActiveIdx: index("idx_referral_configuration_active").on(table.isActive),
  })
);
