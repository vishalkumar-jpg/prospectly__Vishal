import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, sql, isNull } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { extractDomainFromEmail } from "utils/domain-extraction.util";
import { INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES } from "../introduction-potential-connectors.constants";

@Injectable()
export class IntroductionEstimatesHelper {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Check if a user is authorized to view a contact's estimates.
   * A user is authorized if the contact exists and they aren't blocked by privacy rules.
   */
  async isAuthorizedForContact(
    contactId: number,
    userId: string
  ): Promise<boolean> {
    const contact = await this.db.query.contacts.findFirst({
      where: and(
        eq(schema.contacts.id, contactId),
        isNull(schema.contacts.deletedAt)
      ),
    });

    if (!contact) {
      throw new NotFoundException(
        INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES.ERROR.CONTACT_NOT_FOUND ||
          "Contact not found"
      );
    }

    // Get current user's email to check privacy domain
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { email: true },
    });

    if (!user?.email) return false;
    const currentUserDomain = extractDomainFromEmail(user.email);

    if (currentUserDomain) {
      const blockedResult = await this.db.execute(sql`
        SELECT 1 FROM ${schema.contactRelationships} cr
        INNER JOIN ${schema.privacy} up ON up.user_id = cr.user_id
        WHERE cr.contact_id = ${contactId}
        AND up.exclude_from_search = true
        AND up.domain = ${currentUserDomain}
        LIMIT 1
      `);

      const blockedRows = Array.isArray(blockedResult)
        ? blockedResult
        : (blockedResult as AnyType).rows || [];

      if (blockedRows.length > 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all connector estimates (bounty amounts) for a specific contact.
   * This is used to calculate the success percentage for introduction requests.
   */
  async getConnectorEstimates(contactId: number) {
    // 0. Pre-check: Verify contact existence
    const contactExists = await this.db.query.contacts.findFirst({
      where: and(
        eq(schema.contacts.id, contactId),
        isNull(schema.contacts.deletedAt)
      ),
      columns: {
        id: true,
        originalImporterId: true,
        bountyAmount: true,
      },
    });

    if (!contactExists) {
      throw new NotFoundException(
        INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES.ERROR.CONTACT_NOT_FOUND ||
          "Contact not found"
      );
    }

    // 1. Get estimates from strict relationships
    const relationships = await this.db
      .select({
        userId: schema.contactRelationships.userId,
        bountyAmount: schema.contactRelationships.bountyAmount,
      })
      .from(schema.contactRelationships)
      .where(eq(schema.contactRelationships.contactId, contactId));

    const estimates = relationships.map((r) =>
      r.bountyAmount ? Number(r.bountyAmount) : 0
    );

    return { successPercentage: estimates };
  }
}
