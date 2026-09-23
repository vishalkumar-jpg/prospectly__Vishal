import { Injectable, Inject, Logger } from "@nestjs/common";
import {
  eq,
  and,
  or,
  desc,
  sql,
  inArray,
  isNull,
  isNotNull,
} from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { EncryptionService } from "shared/encryption.service";
import { ProfilesService } from "modules/profiles/profiles.service";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AnyType } from "types/common";
import { extractDomainFromEmail } from "utils/domain-extraction.util";
import { createHash } from "node:crypto";
import { CONTACTS_MESSAGES } from "./contacts.constants";

@Injectable()
export class ContactsSearchService {
  private readonly logger = new Logger(ContactsSearchService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    public readonly db: PostgresJsDatabase<typeof schema>,
    private readonly encryptionService: EncryptionService,
    private readonly profilesService: ProfilesService
  ) {}

  private extractLinkedInUsername(url: string): string {
    return url
      .replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "")
      .replace(/\/$/, "");
  }

  async searchGlobalContacts(
    userId: string,
    searchParams: {
      q?: string;
      linkedinUrl?: string;
      name?: string;
      email?: string;
      company?: string;
      website?: string;
    },
    limit = 50
  ) {
    // Validate that at least one search parameter is provided
    const hasLinkedIn = searchParams.linkedinUrl?.trim();
    const hasName =
      searchParams.name?.trim() && searchParams.name.trim().length >= 2;
    const hasEmail = searchParams.email?.trim();
    const hasCompany = searchParams.company?.trim();
    const hasWebsite = searchParams.website?.trim();
    const hasLegacyQuery =
      searchParams.q?.trim() && searchParams.q.trim().length >= 2;

    // Determine if we have a valid search combination
    const isValidLinkedInSearch = !!hasLinkedIn;
    const isValidEmailSearch = !!hasEmail;
    const isValidProfileSearch =
      hasName && (hasEmail || hasCompany || hasWebsite);
    const isValidLegacySearch = hasLegacyQuery;

    if (
      !isValidLinkedInSearch &&
      !isValidEmailSearch &&
      !isValidProfileSearch &&
      !isValidLegacySearch
    ) {
      throw new Error(CONTACTS_MESSAGES.ERROR.SEARCH_QUERY_TOO_SHORT);
    }

    // Get the logged-in user's email for post-filter comparison
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { email: true },
    });

    // Extract current user's domain for privacy checking
    const currentUserDomain = user?.email
      ? extractDomainFromEmail(user.email)
      : null;

    // Build base conditions (always applied)
    const whereConditions: AnyType[] = [
      isNull(schema.contacts.deletedAt),
      // Only include contacts with email address
      isNotNull(schema.contacts.email),
      sql`${schema.contacts.email} != ''`,
      // Exclude contacts created by the user (directly owned)
      // Include contacts with NULL originalImporterId (clay_enrichment/system contacts)
      or(
        isNull(schema.contacts.originalImporterId),
        sql`${schema.contacts.originalImporterId} != ${userId}`
      ),
      // Exclude contacts that the user has a relationship with (connector)
      sql`NOT EXISTS (
        SELECT 1 FROM ${schema.contactRelationships} cr 
        WHERE cr.contact_id = ${schema.contacts.id} 
        AND cr.user_id = ${userId}
      )`,
      // Only include contacts with bounty_amount > 0
      sql`CAST(${schema.contacts.bountyAmount} AS NUMERIC) > 0`,
    ];

    // Privacy filtering: Exclude contacts if ANY owner (via contact_relationships) has blocked the current user's domain
    // This ensures privacy works correctly even when the same contact is imported by multiple users
    if (currentUserDomain) {
      whereConditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM ${schema.contactRelationships} cr
          INNER JOIN ${schema.privacy} up ON up.user_id = cr.user_id
          WHERE cr.contact_id = ${schema.contacts.id}
          AND up.exclude_from_search = true
          AND up.domain = ${currentUserDomain}
        )`
      );
    }

    // Build search conditions based on provided parameters
    const searchConditions: AnyType[] = [];
    let queryDescription = "";

    if (isValidLinkedInSearch) {
      // LinkedIn search - extract username and search both full URL and username
      const linkedinUsername = this.extractLinkedInUsername(
        searchParams.linkedinUrl!
      );
      queryDescription = linkedinUsername;

      // Search in linkedin field - match either full URL containing username or just the username
      searchConditions.push(
        sql`(
          ${schema.contacts.linkedin} ILIKE ${`%${linkedinUsername}%`} OR
          ${schema.contacts.linkedin} ILIKE ${`%linkedin.com/in/${linkedinUsername}%`}
        )`
      );
    } else if (isValidEmailSearch && !hasName) {
      // Email-only search (high confidence) using hash lookup
      const normalizedEmail = searchParams.email!.trim().toLowerCase();
      const emailHash = createHash("sha256")
        .update(normalizedEmail)
        .digest("hex");

      queryDescription = normalizedEmail;

      searchConditions.push(
        sql`(
            EXISTS (
              SELECT 1 FROM ${schema.contactSensitiveData} csd
              WHERE csd.contact_id = ${schema.contacts.id}
              AND csd.normalized_email_hash = ${emailHash}
            )
          )`
      );
    } else if (isValidProfileSearch) {
      // Profile-based search with name + additional field
      const nameQuery = searchParams.name!.trim();
      queryDescription = nameQuery;

      // Split name into parts for first/last name matching
      const nameParts = nameQuery.split(/\s+/);
      const nameConditions: AnyType[] = [];

      if (nameParts.length === 1) {
        // Single word - search in both first and last name
        nameConditions.push(
          sql`(
            ${schema.contacts.firstName} ILIKE ${`%${nameParts[0]}%`} OR 
            ${schema.contacts.lastName} ILIKE ${`%${nameParts[0]}%`}
          )`
        );
      } else {
        // Multiple words - try matching first word as firstName and rest as lastName
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ");
        nameConditions.push(
          sql`(
            (${schema.contacts.firstName} ILIKE ${`%${firstName}%`} AND ${schema.contacts.lastName} ILIKE ${`%${lastName}%`}) OR
            (${schema.contacts.firstName} ILIKE ${`%${nameQuery}%`}) OR
            (${schema.contacts.lastName} ILIKE ${`%${nameQuery}%`})
          )`
        );
      }

      // Add additional field conditions
      const additionalConditions: AnyType[] = [];

      if (hasEmail) {
        const normalizedEmail = searchParams.email!.trim().toLowerCase();
        const emailHash = createHash("sha256")
          .update(normalizedEmail)
          .digest("hex");

        additionalConditions.push(
          sql`(
            EXISTS (
              SELECT 1 FROM ${schema.contactSensitiveData} csd
              WHERE csd.contact_id = ${schema.contacts.id}
              AND csd.normalized_email_hash = ${emailHash}
            )
          )`
        );
      }

      if (hasCompany) {
        additionalConditions.push(
          sql`${schema.contacts.company} ILIKE ${`%${searchParams.company!.trim()}%`}`
        );
      }

      if (hasWebsite) {
        // For website, search in company website field or extract domain pattern
        const websiteQuery = searchParams
          .website!.trim()
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "");
        additionalConditions.push(
          sql`(
            ${schema.contacts.website} ILIKE ${`%${websiteQuery}%`} OR
            ${schema.contacts.email} ILIKE ${`%@${websiteQuery}%`}
          )`
        );
      }

      // Combine name condition with at least one additional condition
      if (additionalConditions.length > 0) {
        searchConditions.push(
          // Change to OR logic so we find contacts if Name matches OR Email matches
          // This fixes the issue where Name="Jitendra" (search) vs "John" (db) failed even if Email matched
          sql`(${or(and(...nameConditions), ...additionalConditions)})`
        );
      } else {
        searchConditions.push(...nameConditions);
      }
    } else if (isValidLegacySearch) {
      // Legacy single query search (backward compatibility)
      const legacyQuery = searchParams.q!.trim();
      queryDescription = legacyQuery;

      searchConditions.push(
        sql`(
          ${schema.contacts.firstName} ILIKE ${`%${legacyQuery}%`} OR 
          ${schema.contacts.lastName} ILIKE ${`%${legacyQuery}%`} OR 
          ${schema.contacts.email} ILIKE ${`%${legacyQuery}%`} OR 
          ${schema.contacts.company} ILIKE ${`%${legacyQuery}%`} OR
          ${schema.contacts.linkedin} ILIKE ${`%${legacyQuery}%`}
        )`
      );
    }

    // Add search conditions to where conditions
    whereConditions.push(...searchConditions);

    let contacts = await this.db.query.contacts.findMany({
      where: and(...whereConditions),
      limit: limit + 5, // Fetch extra to compensate for post-filter
      orderBy: desc(schema.contacts.createdAt),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
        company: true,
        linkedin: true,
        website: true,
        industry: true,
        city: true,
        state: true,
        country: true,
        companyDescription: true,
        companyType: true,
        companyDomain: true,
        companyIndustry: true,
        companyLinkedinUrl: true,
        linkedinConnections: true,
        employees: true,
        bountyAmount: true,
        profilePhotoUrl: true,
        originalImporterId: true,
        phoneNumber: true,
      },
    });

    // Post-filter to exclude contacts whose email matches the logged-in user's email
    if (user?.email && contacts.length > 0) {
      const userEmailNormalized = user.email.toLowerCase().trim();
      const fetchedContactIds = contacts.map((c) => c.id);

      // Get sensitive data for fetched contacts
      const sensitiveDataRows =
        await this.db.query.contactSensitiveData.findMany({
          where: inArray(
            schema.contactSensitiveData.contactId,
            fetchedContactIds
          ),
        });

      // Decrypt emails and find matches
      const decryptedEmails = await Promise.all(
        sensitiveDataRows.map(async (row) => ({
          contactId: row.contactId,
          email: await this.encryptionService.decryptContactEmail(
            row.email,
            row.contactId
          ),
        }))
      );

      // Find contact IDs to exclude (those matching user's email)
      const excludeIds = new Set(
        decryptedEmails
          .filter((d) => d.email?.toLowerCase().trim() === userEmailNormalized)
          .map((d) => d.contactId)
      );

      // Filter out matching contacts and limit to requested count
      contacts = contacts.filter((c) => !excludeIds.has(c.id)).slice(0, limit);
    } else {
      // Ensure we don't return more than requested limit
      contacts = contacts.slice(0, limit);
    }

    // Enrich contacts with connector information from contact_relationships
    // Get the first connector for each contact (for backward compatibility)
    const contactIds = contacts.map((c) => c.id);

    if (contactIds.length === 0) {
      // Convert profile photo URLs to full URLs
      const contactsWithPhotos = await Promise.all(
        contacts.map(async (contact) => {
          const contactWithPhoto = {
            ...contact,
            profilePhotoUrl: contact.profilePhotoUrl || null,
          };
          await this.profilesService.convertProfilePhotoUrlToFullUrl(
            contactWithPhoto
          );
          return {
            ...contact,
            profilePhotoUrl: contactWithPhoto.profilePhotoUrl,
            userId: contact.originalImporterId || null,
            potentialConnectorCount: 0,
          };
        })
      );

      return {
        contacts: contactsWithPhotos,
        count: 0,
        query: queryDescription,
      };
    }

    // Get connectors from contact_relationships for these contacts
    const relationships = await this.db
      .select({
        contactId: schema.contactRelationships.contactId,
        userId: schema.contactRelationships.userId,
      })
      .from(schema.contactRelationships)
      .where(inArray(schema.contactRelationships.contactId, contactIds));

    // Group relationships by contactId
    const contactConnectorsMap = new Map<number, string[]>();
    relationships.forEach((rel) => {
      const existing = contactConnectorsMap.get(rel.contactId) || [];
      existing.push(rel.userId);
      contactConnectorsMap.set(rel.contactId, existing);
    });

    // Get profile information for connectors
    const connectorIds = Array.from(
      new Set(relationships.map((r) => r.userId))
    );
    const connectorProfiles =
      connectorIds.length > 0
        ? await Promise.all(
            connectorIds.map(
              async (id) => await this.profilesService.getProfileById(id)
            )
          )
        : [];

    const profileMap = new Map(
      connectorProfiles.filter((p) => p !== undefined).map((p) => [p!.id, p!])
    );

    // Enrich contacts with connector information and convert photo URLs
    const results = await Promise.all(
      contacts.map(async (contact) => {
        // Get connectors for this contact
        const contactConnectorIds = contactConnectorsMap.get(contact.id) || [];

        // Get profile for the first connector (backward compatibility)
        const [firstConnectorId] = contactConnectorIds;
        const connectorProfile = firstConnectorId
          ? profileMap.get(firstConnectorId)
          : null;

        // Convert profile photo URL to full URL
        const contactWithPhoto = {
          ...contact,
          profilePhotoUrl: contact.profilePhotoUrl || null,
        };
        await this.profilesService.convertProfilePhotoUrlToFullUrl(
          contactWithPhoto
        );

        return {
          ...contact,
          userId: contact.originalImporterId || null, // Keeping for backward compat
          email: null,
          connector: connectorProfile
            ? {
                id: connectorProfile.id,
                firstName: connectorProfile.firstName,
                lastName: connectorProfile.lastName,
                profilePhotoUrl: connectorProfile.profilePhotoUrl,
              }
            : null,
          potentialConnectorCount: contactConnectorIds.length,
          profilePhotoUrl: contactWithPhoto.profilePhotoUrl,
        };
      })
    );

    return {
      contacts: results,
      count: results.length,
      query: queryDescription,
    };
  }
}
