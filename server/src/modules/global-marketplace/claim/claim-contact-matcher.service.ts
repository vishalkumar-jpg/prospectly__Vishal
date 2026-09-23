import { Injectable, Logger, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and, sql } from "drizzle-orm";
import { ContactMatchResult } from "./claim-verification.types";

/**
 * Service to match prospect against user's imported contacts
 * Uses email hash matching and LinkedIn URL matching
 */
@Injectable()
export class ClaimContactMatcherService {
  private readonly logger = new Logger(ClaimContactMatcherService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Check if the user has the prospect in their contacts
   * @param userId - The user ID to search contacts for
   * @param prospectEmailHash - The normalized email hash of the prospect
   * @param prospectLinkedIn - The LinkedIn URL of the prospect
   */
  async findProspectInUserContacts(
    userId: string,
    prospectEmailHash: string | null | undefined,
    prospectLinkedIn: string | null | undefined
  ): Promise<ContactMatchResult> {
    // Try email hash match first
    if (prospectEmailHash) {
      const emailMatch = await this.matchByEmailHash(userId, prospectEmailHash);
      if (emailMatch.matched) {
        return emailMatch;
      }
    }

    // Try LinkedIn match
    if (prospectLinkedIn) {
      const linkedinMatch = await this.matchByLinkedIn(
        userId,
        prospectLinkedIn
      );
      if (linkedinMatch.matched) {
        return linkedinMatch;
      }
    }

    return { matched: false };
  }

  /**
   * Match by normalized email hash directly
   */
  private async matchByEmailHash(
    userId: string,
    emailHash: string
  ): Promise<ContactMatchResult> {
    const result = await this.db
      .select({
        contactId: schema.contacts.id,
      })
      .from(schema.contacts)
      .innerJoin(
        schema.contactRelationships,
        eq(schema.contacts.id, schema.contactRelationships.contactId)
      )
      .innerJoin(
        schema.contactSensitiveData,
        eq(schema.contacts.id, schema.contactSensitiveData.contactId)
      )
      .where(
        and(
          eq(schema.contactRelationships.userId, userId),
          eq(schema.contactSensitiveData.normalizedEmailHash, emailHash)
        )
      )
      .limit(1);

    if (result.length > 0) {
      return {
        matched: true,
        contactId: result[0].contactId,
        matchType: "email",
      };
    }

    return { matched: false };
  }

  /**
   * Match by LinkedIn URL
   */
  private async matchByLinkedIn(
    userId: string,
    linkedinUrl: string
  ): Promise<ContactMatchResult> {
    const normalizedLinkedIn = this.normalizeLinkedInUrl(linkedinUrl);

    const result = await this.db
      .select({
        contactId: schema.contacts.id,
      })
      .from(schema.contacts)
      .innerJoin(
        schema.contactRelationships,
        eq(schema.contacts.id, schema.contactRelationships.contactId)
      )
      .where(
        and(
          eq(schema.contactRelationships.userId, userId),
          sql`LOWER(${schema.contacts.linkedin}) = ${normalizedLinkedIn.toLowerCase()}`
        )
      )
      .limit(1);

    if (result.length > 0) {
      return {
        matched: true,
        contactId: result[0].contactId,
        matchType: "linkedin",
      };
    }

    return { matched: false };
  }

  /**
   * Normalize LinkedIn URL for matching
   */
  private normalizeLinkedInUrl(url: string): string {
    try {
      // Remove protocol and www
      let normalized = url
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .toLowerCase()
        .trim();

      // Remove trailing slash
      if (normalized.endsWith("/")) {
        normalized = normalized.slice(0, -1);
      }

      return normalized;
    } catch {
      return url.toLowerCase().trim();
    }
  }
}
