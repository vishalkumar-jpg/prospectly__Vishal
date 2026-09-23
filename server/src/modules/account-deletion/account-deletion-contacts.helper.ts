import { and, desc, eq, inArray, ne, sql, or } from "drizzle-orm";
import * as schema from "database/schema";
import { Logger as NestLogger } from "@nestjs/common";
import { toUTC } from "utils/dayjs";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { purgeResumeSearchIndexForContacts } from "./account-deletion-resume-index.helper";

const logger = new NestLogger("PurgeContactsHelper");

type InvolvedContact = {
  id: number;
  originalImporterId: string | null;
};

function classifyContactsForPurge(
  contactIds: number[],
  contactToOriginalOwner: Map<number, string>,
  latestOtherUserIdMap: Map<number, string>,
  userId: string
): { contactsToTransfer: number[]; contactsToDelete: number[] } {
  const contactsToTransfer: number[] = [];
  const contactsToDelete: number[] = [];

  for (const id of contactIds) {
    const latestOtherUser = latestOtherUserIdMap.get(id);
    const isOriginalImporter = contactToOriginalOwner.get(id) === userId;

    if (latestOtherUser) {
      if (isOriginalImporter) {
        contactsToTransfer.push(id);
      }
      continue;
    }

    if (isOriginalImporter) {
      contactsToDelete.push(id);
    }
  }

  return { contactsToTransfer, contactsToDelete };
}

async function transferContactOwnership(
  tx: PostgresJsDatabase<typeof schema>,
  userId: string,
  contactsToTransfer: number[],
  latestOtherUserIdMap: Map<number, string>
): Promise<void> {
  if (contactsToTransfer.length === 0) {
    return;
  }

  logger.log(
    `[User: ${userId}] Transferring ownership of ${contactsToTransfer.length} contacts to their next most recent owners.`
  );

  const caseSql = sql`(CASE ${schema.contacts.id} ${sql.join(
    contactsToTransfer.map(
      (id) => sql`WHEN ${id}::bigint THEN ${latestOtherUserIdMap.get(id)}::uuid`
    ),
    sql` `
  )} END)`;

  await tx
    .update(schema.contacts)
    .set({
      originalImporterId: caseSql as unknown as string,
      updatedAt: toUTC(),
    })
    .where(inArray(schema.contacts.id, contactsToTransfer));
}

async function hardDeleteOrphanContacts(
  tx: PostgresJsDatabase<typeof schema>,
  userId: string,
  contactsToDelete: number[],
  deletedContactIds: number[]
): Promise<void> {
  if (contactsToDelete.length === 0) {
    return;
  }

  logger.log(
    `[User: ${userId}] Hard-deleting ${contactsToDelete.length} contacts as no other relationships exist.`
  );

  // Before the delete, not after: contact_resumes.contact_id is
  // ON DELETE SET NULL, so the moment these contacts go the derived search
  // rows become unreachable and their resume text and embedding would outlive
  // the account.
  await purgeResumeSearchIndexForContacts(tx, contactsToDelete);

  await tx
    .delete(schema.contacts)
    .where(inArray(schema.contacts.id, contactsToDelete));

  deletedContactIds.push(...contactsToDelete);
}

async function purgeInvolvedContacts(
  tx: PostgresJsDatabase<typeof schema>,
  userId: string,
  deletedContactIds: number[]
): Promise<void> {
  const userRelationships = await tx
    .select({ contactId: schema.contactRelationships.contactId })
    .from(schema.contactRelationships)
    .where(eq(schema.contactRelationships.userId, userId));

  const relatedContactIds = userRelationships.map((r) => r.contactId);

  const involvedContacts: InvolvedContact[] = await tx
    .select({
      id: schema.contacts.id,
      originalImporterId: schema.contacts.originalImporterId,
    })
    .from(schema.contacts)
    .where(
      or(
        eq(schema.contacts.originalImporterId, userId),
        relatedContactIds.length > 0
          ? inArray(schema.contacts.id, relatedContactIds)
          : sql`FALSE`
      )
    );

  logger.log(
    `[User: ${userId}] Found ${involvedContacts.length} involved contacts (owned or linked).`
  );

  if (involvedContacts.length === 0) {
    return;
  }

  const contactIds = involvedContacts.map((c) => c.id);
  const contactToOriginalOwner = new Map(
    involvedContacts.map((c) => [c.id, c.originalImporterId])
  );

  const otherRelationships = await tx
    .select({
      contactId: schema.contactRelationships.contactId,
      userId: schema.contactRelationships.userId,
    })
    .from(schema.contactRelationships)
    .where(
      and(
        inArray(schema.contactRelationships.contactId, contactIds),
        ne(schema.contactRelationships.userId, userId)
      )
    )
    .orderBy(
      schema.contactRelationships.contactId,
      desc(schema.contactRelationships.createdAt)
    );

  const latestOtherUserIdMap = new Map<number, string>();
  for (const r of otherRelationships) {
    if (!latestOtherUserIdMap.has(r.contactId)) {
      latestOtherUserIdMap.set(r.contactId, r.userId);
    }
  }

  const { contactsToTransfer, contactsToDelete } = classifyContactsForPurge(
    contactIds,
    contactToOriginalOwner,
    latestOtherUserIdMap,
    userId
  );

  await transferContactOwnership(
    tx,
    userId,
    contactsToTransfer,
    latestOtherUserIdMap
  );
  await hardDeleteOrphanContacts(
    tx,
    userId,
    contactsToDelete,
    deletedContactIds
  );
}

/**
 * Handles complex contact deletion:
 * 1. If other users use a contact owned by the target user, transfer ownership to the most recent user.
 * 2. If no other users use the contact, hard-delete it.
 * 3. Finally, clear any remaining relationships for the target user.
 */
export async function purgeContactsForUser(
  db: PostgresJsDatabase<typeof schema>,
  userId: string
): Promise<number[]> {
  logger.log(`[User: ${userId}] Starting contact data purge...`);

  const deletedContactIds: number[] = [];

  await purgeInvolvedContacts(db, userId, deletedContactIds);

  await db
    .delete(schema.contactRelationships)
    .where(eq(schema.contactRelationships.userId, userId));

  logger.log(
    `[User: ${userId}] Contact data purge complete. Relationships removed.`
  );

  return deletedContactIds;
}
