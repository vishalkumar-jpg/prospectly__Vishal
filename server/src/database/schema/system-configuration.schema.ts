import { uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { prospectlySchema } from "./schema-definition";

export const systemConfigurationSchema = prospectlySchema.table(
  "system_configuration",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    value: jsonb("value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
  }
);
