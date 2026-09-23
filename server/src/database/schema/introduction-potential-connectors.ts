import {
  uuid,
  timestamp,
  unique,
  index,
  varchar,
  text,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { introductionRequests } from "./introduction-requests";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const introductionPotentialConnectors = prospectlySchema.table(
  "introduction_potential_connectors",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    requestId: uuid("request_id").references(() => introductionRequests.id, {
      onDelete: "set null",
    }),
    potentialConnectorId: uuid("potential_connector_id").references(
      () => users.id,
      { onDelete: "set null" }
    ),
    status: varchar("status", { length: 30 }).default("pending").notNull(),
    declineReason: varchar("decline_reason", { length: 100 }),
    declineMessage: text("decline_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueRequestPotentialConnector: unique(
      "unique_request_potential_connector"
    ).on(table.requestId, table.potentialConnectorId),
    requestIdIdx: index("idx_ipc_request_id").on(table.requestId),
    potentialConnectorIdIdx: index("idx_ipc_potential_connector_id").on(
      table.potentialConnectorId
    ),
    statusIdx: index("idx_ipc_status").on(table.status),
  })
);

export type IntroductionPotentialConnector =
  typeof introductionPotentialConnectors.$inferSelect;
