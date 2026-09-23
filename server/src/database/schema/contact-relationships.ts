import {
  uuid,
  timestamp,
  bigint,
  index,
  unique,
  numeric,
  varchar,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contacts } from "./contacts";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const contactRelationships = prospectlySchema.table(
  "contact_relationships",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .default(sql`nextval('contact_relationships_id_seq')`),
    contactId: bigint("contact_id", { mode: "number" })
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bountyAmount: numeric("bounty_amount").default("0"),
    bountyStatus: varchar("bounty_status", { length: 30 }).default("pending"),
    bountyCalculationAttempts: integer("bounty_calculation_attempts").default(
      0
    ),
    firstName: varchar("first_name", { length: 50 }),
    lastName: varchar("last_name", { length: 50 }),
    company: varchar("company", { length: 150 }),
    title: varchar("title", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    contactUserIdx: index("idx_contact_relationships_contact_user").on(
      table.contactId,
      table.userId
    ),
    userIdIdx: index("idx_contact_relationships_user_id").on(table.userId),
    uniqueContactUser: unique("unique_contact_user").on(
      table.contactId,
      table.userId
    ),
  })
);

export type ContactRelationship = typeof contactRelationships.$inferSelect;
