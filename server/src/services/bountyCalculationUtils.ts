import { eq } from "drizzle-orm";
import { db } from "database/db";
import { contacts, contactRelationships } from "database/schema";
import { Logger } from "@nestjs/common";
import { toUTC } from "utils/dayjs";

const logger = new Logger("BountyCalculationUtils");

// Type for database transaction - extract from db.transaction callback parameter
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Calculate the median value from an array of numbers
 *
 * @param values - Array of numbers to calculate median from
 * @returns Median value (rounded for even count)
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/**
 * Recalculate and update the median bounty amount for a contact
 * based on all relationships
 *
 * This function is used when:
 * - Bounty amounts are updated for individual relationships (manual update)
 * - After bulk bounty calculation by cron job
 *
 * @param contactId - ID of the contact
 * @param tx - Optional transaction context (defaults to db)
 */
export async function recalculateContactBountyMedian(
  contactId: number,
  tx: typeof db | DbTransaction = db
): Promise<void> {
  try {
    // Fetch all bounty amounts from all relationships for this contact
    const relationships = await tx
      .select({
        bountyAmount: contactRelationships.bountyAmount,
      })
      .from(contactRelationships)
      .where(eq(contactRelationships.contactId, contactId));

    // Convert bounty amounts to numbers, filtering out invalid values
    const bountyValues = relationships
      .map((rel) => {
        const value = rel.bountyAmount ? Number(rel.bountyAmount) : 0;
        return isNaN(value) ? 0 : value;
      })
      .filter((value) => value > 0); // Ensure positive values

    // Calculate median bounty
    const medianBounty = calculateMedian(bountyValues);

    // Update the contact's bounty_amount
    await tx
      .update(contacts)
      .set({
        bountyAmount: medianBounty.toString(),
        updatedAt: toUTC(),
        isTypesenseSynced: false,
      })
      .where(eq(contacts.id, contactId));
  } catch (error: unknown) {
    // Log error but don't fail the operation
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(
      `Failed to recalculate bounty median for contact ${contactId}: ${errorMessage}`
    );
  }
}
