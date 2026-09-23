import { eq, or } from "drizzle-orm";
import * as schema from "database/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/** Clears user FK columns on contact_resumes (ON DELETE NO ACTION). */
export async function nullContactResumeUserRefs(
  tx: PostgresJsDatabase<typeof schema>,
  userId: string
): Promise<void> {
  await tx
    .update(schema.contactResumes)
    .set({ uploadedBy: null, createdBy: null, updatedBy: null })
    .where(
      or(
        eq(schema.contactResumes.uploadedBy, userId),
        eq(schema.contactResumes.createdBy, userId),
        eq(schema.contactResumes.updatedBy, userId)
      )
    );
}
