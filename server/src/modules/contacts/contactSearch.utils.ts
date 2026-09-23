import { and, eq, exists, ilike, or, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { createHash } from "node:crypto";

export interface ContactSearchConditionResult {
  emailHash: string | null;
  searchCondition: AnyType;
}

/**
 * Builds the search condition for contact search based on a search term.
 * Redacts raw PII in hashes and construct Drizzle ORM conditions.
 *
 * @param searchTerm The raw search term from the user
 * @param db Drizzle database instance
 * @returns Object containing hashes and the search condition
 */
export function buildContactSearchCondition(
  searchTerm: string,
  db: PostgresJsDatabase<typeof import("database/schema")>,
  schema: typeof import("database/schema")
): ContactSearchConditionResult {
  const searchToken = searchTerm.trim();
  const isEmailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(searchToken);
  const normalizedEmail = searchToken.toLowerCase();

  const emailHash = isEmailLike
    ? createHash("sha256").update(normalizedEmail).digest("hex")
    : null;

  const searchCondition = or(
    ilike(schema.contacts.firstName, `%${searchToken}%`),
    ilike(schema.contacts.lastName, `%${searchToken}%`),
    ilike(schema.contactRelationships.firstName, `%${searchToken}%`),
    ilike(schema.contactRelationships.lastName, `%${searchToken}%`),
    ilike(
      sql`CONCAT(${schema.contacts.firstName}, ' ', ${schema.contacts.lastName})`,
      `%${searchToken}%`
    ),
    ilike(
      sql`CONCAT(${schema.contactRelationships.firstName}, ' ', ${schema.contactRelationships.lastName})`,
      `%${searchToken}%`
    ),
    ilike(schema.contacts.email, `%${searchToken}%`),
    ilike(schema.contacts.company, `%${searchToken}%`),
    ilike(schema.contactRelationships.company, `%${searchToken}%`),
    emailHash
      ? exists(
          db
            .select({ one: sql`1` })
            .from(schema.contactSensitiveData)
            .where(
              and(
                eq(schema.contactSensitiveData.contactId, schema.contacts.id),
                or(
                  eq(
                    schema.contactSensitiveData.normalizedEmailHash,
                    emailHash
                  ),
                  eq(
                    schema.contactSensitiveData.normalizedSecondaryEmailHash,
                    emailHash
                  )
                )
              )
            )
        )
      : undefined
  );

  return { emailHash, searchCondition };
}
