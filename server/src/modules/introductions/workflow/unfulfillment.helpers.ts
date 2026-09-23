import { and, eq, notInArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";

type DbTx = PostgresJsDatabase<typeof schema>;

export async function getFailedConnectorIds(
  db: DbTx,
  requestId: string
): Promise<string[]> {
  const attempts = await db
    .select({ connectorId: schema.introductionFulfillmentAttempts.connectorId })
    .from(schema.introductionFulfillmentAttempts)
    .where(
      eq(
        schema.introductionFulfillmentAttempts.introductionRequestId,
        requestId
      )
    );

  return [
    ...new Set(
      attempts
        .map((a) => a.connectorId)
        .filter((id): id is string => Boolean(id))
    ),
  ];
}

export async function getEligibleConnectorIdsForRepublish(
  db: DbTx,
  requestId: string
): Promise<string[]> {
  const failedIds = await getFailedConnectorIds(db, requestId);
  const conditions = [
    eq(schema.introductionPotentialConnectors.requestId, requestId),
    eq(schema.introductionPotentialConnectors.status, "archived"),
  ];

  if (failedIds.length > 0) {
    conditions.push(
      notInArray(
        schema.introductionPotentialConnectors.potentialConnectorId,
        failedIds
      )
    );
  }

  const rows = await db
    .select({
      connectorId: schema.introductionPotentialConnectors.potentialConnectorId,
    })
    .from(schema.introductionPotentialConnectors)
    .where(and(...conditions));

  return rows
    .map((row) => row.connectorId)
    .filter((id): id is string => Boolean(id));
}

export async function hasRemainingPrivateConnectors(
  db: DbTx,
  requestId: string
): Promise<boolean> {
  const [pendingEntry] = await db
    .select({ id: schema.introductionPotentialConnectors.id })
    .from(schema.introductionPotentialConnectors)
    .where(
      and(
        eq(schema.introductionPotentialConnectors.requestId, requestId),
        eq(schema.introductionPotentialConnectors.status, "pending")
      )
    )
    .limit(1);

  if (pendingEntry) {
    return true;
  }

  return hasEligibleConnectorsForRepublish(db, requestId);
}

export async function hasEligibleConnectorsForRepublish(
  db: DbTx,
  requestId: string
): Promise<boolean> {
  const eligibleIds = await getEligibleConnectorIdsForRepublish(db, requestId);
  return eligibleIds.length > 0;
}

export async function getFulfillmentAttemptCount(
  db: DbTx,
  requestId: string
): Promise<number> {
  const attempts = await db
    .select({ id: schema.introductionFulfillmentAttempts.id })
    .from(schema.introductionFulfillmentAttempts)
    .where(
      eq(
        schema.introductionFulfillmentAttempts.introductionRequestId,
        requestId
      )
    );

  return attempts.length;
}

export async function updateNeedsRepublishFlag(
  tx: DbTx,
  requestId: string,
  needsRepublish: boolean
): Promise<void> {
  await tx
    .update(schema.introductionRequests)
    .set({ needsRepublish, updatedAt: toUTC() })
    .where(eq(schema.introductionRequests.id, requestId));
}

export async function markConnectorFailed(
  tx: DbTx,
  requestId: string,
  failingConnectorId: string
): Promise<void> {
  await tx
    .update(schema.introductionPotentialConnectors)
    .set({ status: "failed", updatedAt: toUTC() })
    .where(
      and(
        eq(schema.introductionPotentialConnectors.requestId, requestId),
        eq(
          schema.introductionPotentialConnectors.potentialConnectorId,
          failingConnectorId
        )
      )
    );
}

export async function restoreArchivedConnectorsForRetry(
  tx: DbTx,
  requestId: string,
  excludedConnectorIds: string[]
): Promise<number> {
  const restoreConditions = [
    eq(schema.introductionPotentialConnectors.requestId, requestId),
    eq(schema.introductionPotentialConnectors.status, "archived"),
  ];

  if (excludedConnectorIds.length > 0) {
    restoreConditions.push(
      notInArray(
        schema.introductionPotentialConnectors.potentialConnectorId,
        excludedConnectorIds
      )
    );
  }

  const restored = await tx
    .update(schema.introductionPotentialConnectors)
    .set({ status: "pending", updatedAt: toUTC() })
    .where(and(...restoreConditions))
    .returning({ id: schema.introductionPotentialConnectors.id });

  return restored.length;
}

export async function resetRequestForRetry(
  tx: DbTx,
  requestId: string
): Promise<void> {
  await tx
    .update(schema.introductionRequests)
    .set({
      acceptedBy: null,
      acceptedAt: null,
      status: "pending",
      updatedAt: toUTC(),
    })
    .where(eq(schema.introductionRequests.id, requestId));
}
