import { eq, or } from "drizzle-orm";
import * as schema from "database/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/** Clears introduction/marketplace rows and audit FKs not covered elsewhere. */
export async function purgeIntroductionDataForUser(
  tx: PostgresJsDatabase<typeof schema>,
  userId: string
): Promise<void> {
  await tx
    .update(schema.introductionRequestPricesSchema)
    .set({ createdBy: null, updatedBy: null })
    .where(
      or(
        eq(schema.introductionRequestPricesSchema.createdBy, userId),
        eq(schema.introductionRequestPricesSchema.updatedBy, userId)
      )
    );

  await tx
    .update(schema.contactEnrichments)
    .set({ enrichedBy: null })
    .where(eq(schema.contactEnrichments.enrichedBy, userId));

  await tx
    .update(schema.payoutHistory)
    .set({ connectorId: null })
    .where(eq(schema.payoutHistory.connectorId, userId));

  await tx
    .update(schema.introductionFulfillmentAttempts)
    .set({ connectorId: null })
    .where(eq(schema.introductionFulfillmentAttempts.connectorId, userId));

  await tx
    .update(schema.introductionPotentialConnectors)
    .set({ potentialConnectorId: null })
    .where(
      eq(schema.introductionPotentialConnectors.potentialConnectorId, userId)
    );

  await tx
    .update(schema.marketplaceShares)
    .set({ sharerId: null })
    .where(eq(schema.marketplaceShares.sharerId, userId));

  await tx
    .update(schema.marketplaceClaims)
    .set({ sharerId: null })
    .where(eq(schema.marketplaceClaims.sharerId, userId));

  await tx
    .delete(schema.marketplaceClaims)
    .where(eq(schema.marketplaceClaims.claimerId, userId));

  await tx
    .delete(schema.aiUsageLogs)
    .where(eq(schema.aiUsageLogs.userId, userId));

  await tx
    .delete(schema.subscriptionTransactions)
    .where(eq(schema.subscriptionTransactions.userId, userId));

  await tx
    .delete(schema.userCreditHistory)
    .where(eq(schema.userCreditHistory.userId, userId));

  await tx
    .delete(schema.userInvites)
    .where(
      or(
        eq(schema.userInvites.invitedByUserId, userId),
        eq(schema.userInvites.acceptedUserId, userId),
        eq(schema.userInvites.referralCreditedTo, userId)
      )
    );
}
