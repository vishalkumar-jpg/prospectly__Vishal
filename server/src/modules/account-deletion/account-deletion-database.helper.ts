import { eq } from "drizzle-orm";
import * as schema from "database/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { purgeRecruitmentDataForUser } from "./account-deletion-recruitment.helper";
import { purgeIntroductionDataForUser } from "./account-deletion-introduction.helper";

/**
 * Performs a comprehensive deletion of all user-related data across non-financial tables.
 * This is designed to be called within a database transaction.
 */
export async function deleteUserRelatedData(
  tx: PostgresJsDatabase<typeof schema>,
  userId: string
): Promise<void> {
  await tx
    .delete(schema.userConfigurations)
    .where(eq(schema.userConfigurations.userId, userId));

  await tx
    .delete(schema.referralProgress)
    .where(eq(schema.referralProgress.userId, userId));

  await tx
    .delete(schema.inviteVerificationLogs)
    .where(eq(schema.inviteVerificationLogs.userId, userId));

  await tx
    .delete(schema.referralAuditLog)
    .where(eq(schema.referralAuditLog.userId, userId));

  await purgeRecruitmentDataForUser(tx, userId);
  await purgeIntroductionDataForUser(tx, userId);

  await tx
    .delete(schema.contactFileImports)
    .where(eq(schema.contactFileImports.createdBy, userId));

  await tx
    .delete(schema.contactsImports)
    .where(eq(schema.contactsImports.userId, userId));

  await tx
    .delete(schema.userSubscription)
    .where(eq(schema.userSubscription.userId, userId));
}
