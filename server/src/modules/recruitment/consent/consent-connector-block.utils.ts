import { and, eq, isNull } from "drizzle-orm";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";
import { CONSENT_DECLINE_DONT_KNOW_CONNECTOR_LABEL } from "./consent.constants";

type DbLike = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- drizzle db + tx share query API
  select: (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert: (...args: any[]) => any;
};

/** True when this connector is permanently blocked for the candidate email. */
export async function isConnectorBlockedForCandidate(
  db: DbLike,
  params: { connectorUserId: string; candidateEmailHash: string }
): Promise<boolean> {
  const table = schema.recruitmentConnectorBlocks;
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(
      and(
        eq(table.connectorUserId, params.connectorUserId),
        eq(table.candidateEmailHash, params.candidateEmailHash),
        isNull(table.deletedAt)
      )
    )
    .limit(1);
  return !!row;
}

/** Persist a global candidate→connector block (idempotent on unique key). */
export async function upsertConnectorBlock(
  db: DbLike,
  params: {
    candidateEmailHash: string;
    connectorUserId: string;
    contactId: number | null;
    /** Optional description; defaults to the decline option label. */
    reason?: string | null;
  }
): Promise<void> {
  const now = toUTC();
  const table = schema.recruitmentConnectorBlocks;
  const reasonText =
    params.reason?.trim() || CONSENT_DECLINE_DONT_KNOW_CONNECTOR_LABEL;

  await db
    .insert(table)
    .values({
      candidateEmailHash: params.candidateEmailHash,
      connectorUserId: params.connectorUserId,
      contactId: params.contactId,
      reason: reasonText,
      createdAt: now,
      updatedAt: now,
      createdBy: params.connectorUserId,
      updatedBy: params.connectorUserId,
    })
    .onConflictDoNothing({
      target: [table.candidateEmailHash, table.connectorUserId],
    });
}
