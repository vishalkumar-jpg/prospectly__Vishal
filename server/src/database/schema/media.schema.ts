import { uuid, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { prospectlySchema } from "./schema-definition";

export const mediaSchema = prospectlySchema.table("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  recordId: uuid("record_id").notNull(),
  module: text("module").notNull(),
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  mimeType: text("mime_type"),
  size: numeric("size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
});
