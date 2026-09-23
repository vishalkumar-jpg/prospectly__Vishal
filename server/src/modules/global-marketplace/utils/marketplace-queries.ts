import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, SQL, eq, sql } from "drizzle-orm";
import * as schema from "database/schema";

export interface BrowseRequestResult {
  id: string;
  requesterId: string | null;
  contactName: string | null;
  meetingTitle: string | null;
  meetingDescription: string | null;
  bountyAmount: string;
  isUrgent: boolean;
  expiredAt: Date | null;
  createdAt: Date;
  // Contact details from contacts table
  contactId: number | null;
  contactTitle: string | null;
  contactCompany: string | null;
  contactLinkedin: string | null;
  contactWebsite: string | null;
  contactProfilePhotoUrl: string | null;
}

/**
 * Executes the browse query with given conditions, orderBy, limit, and offset
 */
export async function executeBrowseQuery(
  db: PostgresJsDatabase<typeof schema>,
  conditions: SQL[],
  orderBy: SQL,
  limit: number,
  offset: number,
  userId?: string
): Promise<BrowseRequestResult[]> {
  let query = db
    .select({
      id: schema.introductionRequests.id,
      requesterId: schema.introductionRequests.requesterId,
      contactName: schema.introductionRequests.contactName,
      meetingTitle: schema.introductionRequests.meetingTitle,
      meetingDescription: schema.introductionRequests.meetingDescription,
      bountyAmount: schema.introductionRequests.bountyAmount,
      isUrgent: schema.introductionRequests.isUrgent,
      expiredAt: schema.introductionRequests.expiredAt,
      createdAt: schema.introductionRequests.createdAt,
      // Contact details from contacts table with fallback to contact_relationships
      contactId: schema.introductionRequests.contactId,
      contactTitle: userId
        ? sql<
            string | null
          >`COALESCE(${schema.contacts.title}, ${schema.contactRelationships.title})`.as(
            "contactTitle"
          )
        : schema.contacts.title,
      contactCompany: schema.contacts.company,
      contactLinkedin: schema.contacts.linkedin,
      contactWebsite: schema.contacts.website,
      contactProfilePhotoUrl: schema.contacts.profilePhotoUrl,
    })
    .from(schema.introductionRequests)
    .leftJoin(
      schema.contacts,
      eq(schema.introductionRequests.contactId, schema.contacts.id)
    );

  // Join contact_relationships if userId is provided
  if (userId) {
    query = query.leftJoin(
      schema.contactRelationships,
      and(
        eq(schema.contacts.id, schema.contactRelationships.contactId),
        eq(schema.contactRelationships.userId, userId)
      )
    );
  }

  return await query
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);
}
