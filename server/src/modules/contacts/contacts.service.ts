import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  Optional,
  Logger,
} from "@nestjs/common";
import { eq, and, or, sql, inArray, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { EncryptionService } from "shared/encryption.service";
import { MaskingService } from "shared/masking.service";
import { GoogleContactsQueueService } from "modules/contact-queue/google/google-contacts-queue.service";
import { MicrosoftContactsQueueService } from "modules/contact-queue/microsoft/microsoft-contacts-queue.service";
import { AppleContactsQueueService } from "modules/contact-queue/apple/apple-contacts-queue.service";
import { LinkedInContactsQueueService } from "modules/contact-queue/linkedin/linkedin-contacts-queue.service";
import {
  ClaimVerificationService,
  ClaimVerificationQueueService,
} from "modules/global-marketplace/claim";
import { ContactsImportService } from "modules/contact-queue/contacts-import.service";
import { ContactsProviderTokensService } from "modules/contact-queue/contacts-provider-tokens.service";
import { TrustScoreQueueService } from "modules/trust-score-queue/trust-score-queue.service";
import { TypesenseSyncQueueService } from "modules/typesense/sync-queue/typesense-sync-queue.service";
import { S3Service } from "shared/s3.service";
import { oauthConfig } from "config/oauth.config";
import { appConfig } from "config/app.config";
import { normalizeImportAccountEmail } from "utils/contact-import-account.utils";
import { getGoogleUserEmailFromOAuthTokens } from "utils/google-oauth-user-email.utils";
import { ProfilesService } from "modules/profiles/profiles.service";
import { UserConfigurationsService } from "modules/user-configurations/user-configurations.service";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CreateContactDto } from "./contacts.dto";
import {
  CONTACTS_MESSAGES,
  type ContactListSortBy,
  type ContactListSortDir,
} from "./contacts.constants";
import { sortContactsForList } from "./contacts-list-sort.utils";
import { ContactRow } from "./contacts.types";
import { buildContactSearchCondition } from "./contactSearch.utils";
import { recalculateContactBountyMedian } from "../../services/bountyCalculationUtils";
import { fetchMicrosoftContactPhoto } from "../../services/microsoft-contacts.service";

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    public readonly db: PostgresJsDatabase<typeof schema>,
    private readonly encryptionService: EncryptionService,
    private readonly maskingService: MaskingService,
    @Optional()
    private readonly googleContactsQueueService: GoogleContactsQueueService | null,
    @Optional()
    private readonly microsoftContactsQueueService: MicrosoftContactsQueueService | null,
    @Optional()
    private readonly appleContactsQueueService: AppleContactsQueueService | null,
    @Optional()
    private readonly linkedinContactsQueueService: LinkedInContactsQueueService | null,
    private readonly contactsImportService: ContactsImportService,
    private readonly contactsProviderTokensService: ContactsProviderTokensService,
    private readonly trustScoreQueueService: TrustScoreQueueService,
    private readonly profilesService: ProfilesService,
    private readonly userConfigurationsService: UserConfigurationsService,
    private readonly s3Service: S3Service,
    @Optional()
    private readonly claimVerificationService: ClaimVerificationService | null,
    @Optional()
    private readonly claimVerificationQueueService: ClaimVerificationQueueService | null,
    @Optional()
    private readonly typesenseSyncQueueService: TypesenseSyncQueueService | null
  ) {}

  // Minimal set of fields needed for the contacts list API to keep payload small
  // Note: source field is now aggregated from contact_import_snapshots in queries
  private readonly contactListBaseSelect = {
    id: schema.contacts.id,
    firstName: schema.contacts.firstName,
    lastName: schema.contacts.lastName,
    title: schema.contacts.title,
    company: schema.contacts.company,
    phoneNumber: schema.contacts.phoneNumber,
    email: schema.contacts.email,
    linkedin: schema.contacts.linkedin,
    source: schema.contacts.source,
    profilePhotoUrl: schema.contacts.profilePhotoUrl,
    createdAt: schema.contacts.createdAt,
    updatedAt: schema.contacts.updatedAt,
  };

  // Select for contacts with relationships - bountyAmount comes from contact_relationships
  private readonly contactListWithRelationshipSelect = {
    ...this.contactListBaseSelect,
    bountyAmount: schema.contactRelationships.bountyAmount,
    bountyStatus: schema.contactRelationships.bountyStatus,
    enrichmentStatus: schema.contactEnrichments.enrichmentStatus,
  };

  // Select for legacy contacts - bountyAmount comes from contacts table (fallback)
  private readonly contactListSelect = {
    ...this.contactListBaseSelect,
    bountyAmount: schema.contacts.bountyAmount,
    bountyStatus: sql<string>`'pending'`.as("bountyStatus"), // Default for legacy
    enrichmentStatus: schema.contactEnrichments.enrichmentStatus,
  };

  async getContactsByUserId(userId: string) {
    // First, get contacts via contact_relationships (new system) with aggregated sources as array
    // Use COALESCE to prioritize relationship-specific fields, fallback to main contact table
    const relationshipContacts = await this.db
      .select({
        id: schema.contacts.id,
        firstName: sql<
          string | null
        >`COALESCE(${schema.contactRelationships.firstName}, ${schema.contacts.firstName})`.as(
          "firstName"
        ),
        lastName: sql<
          string | null
        >`COALESCE(${schema.contactRelationships.lastName}, ${schema.contacts.lastName})`.as(
          "lastName"
        ),
        title: sql<
          string | null
        >`COALESCE(${schema.contactRelationships.title}, ${schema.contacts.title})`.as(
          "title"
        ),
        company: sql<
          string | null
        >`COALESCE(${schema.contactRelationships.company}, ${schema.contacts.company})`.as(
          "company"
        ),
        phoneNumber: schema.contacts.phoneNumber,
        email: schema.contacts.email,
        linkedin: schema.contacts.linkedin,
        source: sql<string[]>`COALESCE(
          array_agg(DISTINCT ${schema.contactImportSnapshots.sourceType} ORDER BY ${schema.contactImportSnapshots.sourceType}),
          CASE 
            WHEN ${schema.contacts.source} IS NOT NULL THEN ARRAY[${schema.contacts.source}]
            ELSE ARRAY['Manual']
          END
        )`.as("source"),
        profilePhotoUrl: schema.contacts.profilePhotoUrl,
        createdAt: schema.contacts.createdAt,
        updatedAt: schema.contacts.updatedAt,
        bountyAmount: schema.contactRelationships.bountyAmount,
        bountyStatus: schema.contactRelationships.bountyStatus,
        enrichmentStatus: schema.contactEnrichments.enrichmentStatus,
      })
      .from(schema.contacts)
      .innerJoin(
        schema.contactRelationships,
        eq(schema.contacts.id, schema.contactRelationships.contactId)
      )
      .leftJoin(
        schema.contactImportSnapshots,
        eq(
          schema.contactRelationships.id,
          schema.contactImportSnapshots.relationshipId
        )
      )
      .leftJoin(
        schema.contactEnrichments,
        eq(schema.contacts.id, schema.contactEnrichments.contactId)
      )
      .where(
        and(
          eq(schema.contactRelationships.userId, userId),
          isNull(schema.contacts.deletedAt)
        )
      )
      .groupBy(
        schema.contacts.id,
        schema.contacts.firstName,
        schema.contacts.lastName,
        schema.contacts.title,
        schema.contacts.company,
        schema.contacts.phoneNumber,
        schema.contacts.email,
        schema.contacts.linkedin,
        schema.contactRelationships.bountyAmount,
        schema.contactRelationships.bountyStatus,
        schema.contactRelationships.firstName,
        schema.contactRelationships.lastName,
        schema.contactRelationships.title,
        schema.contactRelationships.company,
        schema.contacts.profilePhotoUrl,
        schema.contacts.createdAt,
        schema.contacts.updatedAt,
        schema.contacts.source,
        schema.contactEnrichments.enrichmentStatus
      );

    // Get contact IDs from relationships to avoid duplicates
    const relationshipContactIds = new Set(
      relationshipContacts.map((c) => c.id)
    );

    // Also get contacts via direct userId (backward compatibility for legacy data)
    // For legacy contacts, try to get sources from relationships if they exist
    const legacyContactsRaw = await this.db
      .select({
        ...this.contactListSelect,
        relationshipId: schema.contactRelationships.id,
        source: schema.contacts.source,
      })
      .from(schema.contacts)
      .leftJoin(
        schema.contactRelationships,
        and(
          eq(schema.contacts.id, schema.contactRelationships.contactId),
          eq(schema.contactRelationships.userId, userId)
        )
      )
      .leftJoin(
        schema.contactEnrichments,
        eq(schema.contacts.id, schema.contactEnrichments.contactId)
      )
      .where(
        and(
          eq(schema.contacts.originalImporterId, userId),
          isNull(schema.contacts.deletedAt),
          sql`${schema.contacts.id} NOT IN (${sql.join(
            relationshipContactIds.size > 0
              ? Array.from(relationshipContactIds).map((id) => sql`${id}`)
              : [sql`NULL`],
            sql`, `
          )})`
        )
      );

    // For legacy contacts with relationships, aggregate their sources
    const legacyContactsWithRelationships = legacyContactsRaw.filter(
      (c) => c.relationshipId
    );
    const legacyContactIdsWithRelationships = new Set(
      legacyContactsWithRelationships.map((c) => c.id)
    );

    const legacyContacts: Array<AnyType> = [];

    if (legacyContactsWithRelationships.length > 0) {
      const legacyWithSources = await this.db
        .select({
          id: schema.contacts.id,
          firstName: sql<
            string | null
          >`COALESCE(${schema.contactRelationships.firstName}, ${schema.contacts.firstName})`.as(
            "firstName"
          ),
          lastName: sql<
            string | null
          >`COALESCE(${schema.contactRelationships.lastName}, ${schema.contacts.lastName})`.as(
            "lastName"
          ),
          title: sql<
            string | null
          >`COALESCE(${schema.contactRelationships.title}, ${schema.contacts.title})`.as(
            "title"
          ),
          company: sql<
            string | null
          >`COALESCE(${schema.contactRelationships.company}, ${schema.contacts.company})`.as(
            "company"
          ),
          phoneNumber: schema.contacts.phoneNumber,
          email: schema.contacts.email,
          linkedin: schema.contacts.linkedin,
          source: sql<string[]>`COALESCE(
            array_agg(DISTINCT ${schema.contactImportSnapshots.sourceType} ORDER BY ${schema.contactImportSnapshots.sourceType}),
            CASE 
              WHEN ${schema.contacts.source} IS NOT NULL THEN ARRAY[${schema.contacts.source}]
              ELSE ARRAY['Manual']
            END
          )`.as("source"),
          profilePhotoUrl: schema.contacts.profilePhotoUrl,
          createdAt: schema.contacts.createdAt,
          updatedAt: schema.contacts.updatedAt,
          bountyAmount: schema.contacts.bountyAmount,
          bountyStatus: schema.contactRelationships.bountyStatus,
          enrichmentStatus: schema.contactEnrichments.enrichmentStatus,
        })
        .from(schema.contacts)
        .innerJoin(
          schema.contactRelationships,
          eq(schema.contacts.id, schema.contactRelationships.contactId)
        )
        .leftJoin(
          schema.contactImportSnapshots,
          eq(
            schema.contactRelationships.id,
            schema.contactImportSnapshots.relationshipId
          )
        )
        .leftJoin(
          schema.contactEnrichments,
          eq(schema.contacts.id, schema.contactEnrichments.contactId)
        )
        .where(
          and(
            eq(schema.contactRelationships.userId, userId),
            isNull(schema.contacts.deletedAt),
            inArray(
              schema.contacts.id,
              Array.from(legacyContactIdsWithRelationships)
            )
          )
        )
        .groupBy(
          schema.contacts.id,
          schema.contacts.firstName,
          schema.contacts.lastName,
          schema.contacts.title,
          schema.contacts.company,
          schema.contacts.phoneNumber,
          schema.contacts.email,
          schema.contacts.linkedin,
          schema.contacts.bountyAmount,
          schema.contactRelationships.firstName,
          schema.contactRelationships.lastName,
          schema.contactRelationships.title,
          schema.contactRelationships.company,
          schema.contacts.profilePhotoUrl,
          schema.contacts.createdAt,
          schema.contacts.updatedAt,
          schema.contacts.source,
          schema.contactEnrichments.enrichmentStatus
        );

      legacyContacts.push(...legacyWithSources);
    }

    // Add legacy contacts without relationships (use contacts.source as fallback)
    const legacyContactsWithoutRelationships = legacyContactsRaw
      .filter((c) => !c.relationshipId)
      .map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        title: c.title,
        company: c.company,
        phoneNumber: c.phoneNumber,
        email: c.email,
        linkedin: c.linkedin,
        bountyAmount: c.bountyAmount,
        profilePhotoUrl: c.profilePhotoUrl,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        source: c.source ? [c.source] : ["Manual"],
        enrichmentStatus: c.enrichmentStatus,
        bountyStatus: "pending",
      }));

    legacyContacts.push(...legacyContactsWithoutRelationships);

    // Merge results, avoiding duplicates (relationship contacts take precedence)
    const allContacts: AnyType[] = [...relationshipContacts];
    for (const contact of legacyContacts) {
      if (!relationshipContactIds.has(contact.id)) {
        allContacts.push(contact);
      }
    }

    return allContacts;
  }

  async getContactDecryptedEmail(contactId: number): Promise<string | null> {
    // Fetch encrypted email from contact_sensitive_data table
    const sensitiveData = await this.db.query.contactSensitiveData.findFirst({
      where: eq(schema.contactSensitiveData.contactId, contactId),
    });

    if (!sensitiveData || !sensitiveData.email) {
      return null;
    }

    // Decrypt the email using the encryption service
    const decryptedEmail = await this.encryptionService.decryptContactEmail(
      sensitiveData.email,
      contactId
    );

    return decryptedEmail || null;
  }

  async checkEmailExistsForOtherContact(email: string): Promise<boolean> {
    if (!email || !email.trim()) {
      return false;
    }

    // Normalize email for comparison (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Query contacts with emails using raw SQL: contacts.id = contact_sensitive_data.contact_id
    const result = await this.db.execute(
      sql<{
        contact_id: number;
        email: string;
      }>`
        SELECT 
          c.id as contact_id,
          csd.email
        FROM contacts c
        INNER JOIN contact_sensitive_data csd ON c.id = csd.contact_id
        WHERE c.deleted_at IS NULL
      `
    );

    const rows = Array.isArray(result)
      ? result
      : (result as AnyType).rows || [];

    if (!rows.length) {
      return false;
    }

    // Decrypt all emails in parallel and check if any match
    const decryptedEmails = await Promise.all(
      rows.map((row) =>
        this.encryptionService.decryptContactEmail(row.email, row.contact_id)
      )
    );

    return decryptedEmails.some(
      (decryptedEmail) =>
        decryptedEmail &&
        decryptedEmail.toLowerCase().trim() === normalizedEmail
    );
  }

  async searchContactsInternal(userId: string, searchTerm: string) {
    const { emailHash, searchCondition } = buildContactSearchCondition(
      searchTerm,
      this.db,
      schema
    );

    this.logger.log(
      `SEARCH :: User ${userId} | Term: [REDACTED] | EmailHash: ${emailHash}`
    );

    // Search via contact_relationships with aggregated sources as array
    // Use COALESCE to prioritize relationship-specific fields, fallback to main contact table
    const relationshipContacts = await this.db
      .select({
        id: schema.contacts.id,
        firstName: sql<
          string | null
        >`COALESCE(${schema.contactRelationships.firstName}, ${schema.contacts.firstName})`.as(
          "firstName"
        ),
        lastName: sql<
          string | null
        >`COALESCE(${schema.contactRelationships.lastName}, ${schema.contacts.lastName})`.as(
          "lastName"
        ),
        title: sql<
          string | null
        >`COALESCE(${schema.contactRelationships.title}, ${schema.contacts.title})`.as(
          "title"
        ),
        company: sql<
          string | null
        >`COALESCE(${schema.contactRelationships.company}, ${schema.contacts.company})`.as(
          "company"
        ),
        phoneNumber: schema.contacts.phoneNumber,
        email: schema.contacts.email,
        linkedin: schema.contacts.linkedin,
        source: sql<string[]>`COALESCE(
          array_agg(DISTINCT ${schema.contactImportSnapshots.sourceType} ORDER BY ${schema.contactImportSnapshots.sourceType}),
          CASE 
            WHEN ${schema.contacts.source} IS NOT NULL THEN ARRAY[${schema.contacts.source}]
            ELSE ARRAY['Manual']
          END
        )`.as("source"),
        profilePhotoUrl: schema.contacts.profilePhotoUrl,
        createdAt: schema.contacts.createdAt,
        updatedAt: schema.contacts.updatedAt,
        bountyAmount: schema.contactRelationships.bountyAmount,
        bountyStatus: schema.contactRelationships.bountyStatus,
        enrichmentStatus: schema.contactEnrichments.enrichmentStatus,
      })
      .from(schema.contacts)
      .innerJoin(
        schema.contactRelationships,
        eq(schema.contacts.id, schema.contactRelationships.contactId)
      )
      .leftJoin(
        schema.contactImportSnapshots,
        eq(
          schema.contactRelationships.id,
          schema.contactImportSnapshots.relationshipId
        )
      )
      .leftJoin(
        schema.contactEnrichments,
        eq(schema.contacts.id, schema.contactEnrichments.contactId)
      )
      .where(
        and(
          eq(schema.contactRelationships.userId, userId),
          isNull(schema.contacts.deletedAt),
          searchCondition
        )
      )
      .groupBy(
        schema.contacts.id,
        schema.contacts.firstName,
        schema.contacts.lastName,
        schema.contacts.title,
        schema.contacts.company,
        schema.contacts.phoneNumber,
        schema.contacts.email,
        schema.contacts.linkedin,
        schema.contactRelationships.bountyAmount,
        schema.contactRelationships.bountyStatus,
        schema.contactRelationships.firstName,
        schema.contactRelationships.lastName,
        schema.contactRelationships.title,
        schema.contactRelationships.company,
        schema.contacts.profilePhotoUrl,
        schema.contacts.createdAt,
        schema.contacts.updatedAt,
        schema.contacts.source,
        schema.contactEnrichments.enrichmentStatus
      );

    const relationshipContactIds = new Set(
      relationshipContacts.map((c) => c.id)
    );

    // Also search via direct userId (backward compatibility)
    // For legacy contacts, try to get sources from relationships if they exist
    const legacyContactsRaw = await this.db
      .select({
        ...this.contactListSelect,
        relationshipId: schema.contactRelationships.id,
        source: schema.contacts.source,
      })
      .from(schema.contacts)
      .leftJoin(
        schema.contactRelationships,
        and(
          eq(schema.contacts.id, schema.contactRelationships.contactId),
          eq(schema.contactRelationships.userId, userId)
        )
      )
      .leftJoin(
        schema.contactEnrichments,
        eq(schema.contacts.id, schema.contactEnrichments.contactId)
      )
      .where(
        and(
          eq(schema.contacts.originalImporterId, userId),
          isNull(schema.contacts.deletedAt),
          searchCondition,
          sql`${schema.contacts.id} NOT IN (${sql.join(
            relationshipContactIds.size > 0
              ? Array.from(relationshipContactIds).map((id) => sql`${id}`)
              : [sql`NULL`],
            sql`, `
          )})`
        )
      );

    // For legacy contacts with relationships, aggregate their sources
    const legacyContactsWithRelationships = legacyContactsRaw.filter(
      (c) => c.relationshipId
    );
    const legacyContactIdsWithRelationships = new Set(
      legacyContactsWithRelationships.map((c) => c.id)
    );

    const legacyContacts: Array<AnyType> = [];

    if (legacyContactsWithRelationships.length > 0) {
      const legacyWithSources = await this.db
        .select({
          id: schema.contacts.id,
          firstName: sql<
            string | null
          >`COALESCE(${schema.contactRelationships.firstName}, ${schema.contacts.firstName})`.as(
            "firstName"
          ),
          lastName: sql<
            string | null
          >`COALESCE(${schema.contactRelationships.lastName}, ${schema.contacts.lastName})`.as(
            "lastName"
          ),
          title: sql<
            string | null
          >`COALESCE(${schema.contactRelationships.title}, ${schema.contacts.title})`.as(
            "title"
          ),
          company: sql<
            string | null
          >`COALESCE(${schema.contactRelationships.company}, ${schema.contacts.company})`.as(
            "company"
          ),
          phoneNumber: schema.contacts.phoneNumber,
          email: schema.contacts.email,
          linkedin: schema.contacts.linkedin,
          source: sql<string[]>`COALESCE(
            array_agg(DISTINCT ${schema.contactImportSnapshots.sourceType} ORDER BY ${schema.contactImportSnapshots.sourceType}),
            CASE 
              WHEN ${schema.contacts.source} IS NOT NULL THEN ARRAY[${schema.contacts.source}]
              ELSE ARRAY['Manual']
            END
          )`.as("source"),
          profilePhotoUrl: schema.contacts.profilePhotoUrl,
          createdAt: schema.contacts.createdAt,
          updatedAt: schema.contacts.updatedAt,
          bountyAmount: schema.contacts.bountyAmount,
          bountyStatus: schema.contactRelationships.bountyStatus,
          enrichmentStatus: schema.contactEnrichments.enrichmentStatus,
        })
        .from(schema.contacts)
        .innerJoin(
          schema.contactRelationships,
          eq(schema.contacts.id, schema.contactRelationships.contactId)
        )
        .leftJoin(
          schema.contactImportSnapshots,
          eq(
            schema.contactRelationships.id,
            schema.contactImportSnapshots.relationshipId
          )
        )
        .leftJoin(
          schema.contactEnrichments,
          eq(schema.contacts.id, schema.contactEnrichments.contactId)
        )
        .where(
          and(
            eq(schema.contactRelationships.userId, userId),
            isNull(schema.contacts.deletedAt),
            searchCondition,
            inArray(
              schema.contacts.id,
              Array.from(legacyContactIdsWithRelationships)
            )
          )
        )
        .groupBy(
          schema.contacts.id,
          schema.contacts.firstName,
          schema.contacts.lastName,
          schema.contacts.title,
          schema.contacts.company,
          schema.contacts.phoneNumber,
          schema.contacts.email,
          schema.contacts.linkedin,
          schema.contacts.bountyAmount,
          schema.contactRelationships.firstName,
          schema.contactRelationships.lastName,
          schema.contactRelationships.title,
          schema.contactRelationships.company,
          schema.contacts.profilePhotoUrl,
          schema.contacts.createdAt,
          schema.contacts.updatedAt,
          schema.contacts.source,
          schema.contactEnrichments.enrichmentStatus
        );

      legacyContacts.push(...legacyWithSources);
    }

    // Add legacy contacts without relationships (use contacts.source as fallback)
    const legacyContactsWithoutRelationships = legacyContactsRaw
      .filter((c) => !c.relationshipId)
      .map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        title: c.title,
        company: c.company,
        phoneNumber: c.phoneNumber,
        email: c.email,
        linkedin: c.linkedin,
        bountyAmount: c.bountyAmount,
        profilePhotoUrl: c.profilePhotoUrl,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        source: c.source ? [c.source] : ["Manual"],
        enrichmentStatus: c.enrichmentStatus,
        bountyStatus: "pending", // Default
      }));

    legacyContacts.push(...legacyContactsWithoutRelationships);

    // Merge results avoiding duplicates
    const allContacts: AnyType[] = [...relationshipContacts];
    for (const contact of legacyContacts) {
      if (!relationshipContactIds.has(contact.id)) {
        allContacts.push(contact);
      }
    }

    return allContacts;
  }

  async getContactByEmail(userId: string, email: string) {
    // Try via contact_relationships first
    const relationshipResults = await this.db
      .select({
        id: schema.contacts.id,
        firstName: schema.contacts.firstName,
        lastName: schema.contacts.lastName,
        gender: schema.contacts.gender,
        title: schema.contacts.title,
        company: schema.contacts.company,

        email: schema.contacts.email,
        employees: schema.contacts.employees,
        industry: schema.contacts.industry,
        linkedin: schema.contacts.linkedin,
        website: schema.contacts.website,
        city: schema.contacts.city,
        state: schema.contacts.state,
        country: schema.contacts.country,
        profilePhotoUrl: schema.contacts.profilePhotoUrl,
        source: schema.contacts.source,
        originalImporterId: schema.contacts.originalImporterId,
        bountyAmount: schema.contacts.bountyAmount,
        createdAt: schema.contacts.createdAt,
        updatedAt: schema.contacts.updatedAt,
        deletedAt: schema.contacts.deletedAt,
      })
      .from(schema.contacts)
      .innerJoin(
        schema.contactRelationships,
        eq(schema.contacts.id, schema.contactRelationships.contactId)
      )
      .where(
        and(
          eq(schema.contactRelationships.userId, userId),
          eq(schema.contacts.email, email),
          isNull(schema.contacts.deletedAt)
        )
      )
      .limit(1);

    if (relationshipResults.length > 0) {
      return relationshipResults[0];
    }

    // Fallback to direct userId (backward compatibility)
    return await this.db.query.contacts.findFirst({
      where: and(
        eq(schema.contacts.originalImporterId, userId),
        eq(schema.contacts.email, email),
        isNull(schema.contacts.deletedAt)
      ),
    });
  }

  async createContact(userId: string, createContactDto: CreateContactDto) {
    const { importContacts } =
      await import("../../services/contactImportService");

    // Transform DTO to import format and use centralized import service
    // which handles encryption and dual-table storage
    const contactRow: ContactRow = {
      first_name: createContactDto.firstName,
      last_name: createContactDto.lastName,
      email: createContactDto.email,
      phone_number: createContactDto.phoneNumber || undefined,
      company: createContactDto.company || undefined,
      title: createContactDto.title || undefined,
      linkedin: createContactDto.linkedin || undefined,
      website: createContactDto.website || undefined,
      city: createContactDto.city || undefined,
      state: createContactDto.state || undefined,
      country: createContactDto.country || undefined,
      industry: createContactDto.industry || undefined,
      secondary_email: createContactDto.secondaryEmail || undefined,
    };

    const result = await importContacts([contactRow], {
      userId,
      source: createContactDto.source || "manual",
      allowUpdates: false,
    });

    if (result.errors > 0) {
      throw new Error(
        result.errorMessages[0] ||
          CONTACTS_MESSAGES.ERROR.FAILED_TO_CREATE_CONTACT
      );
    }

    // Return the created contact
    const contacts = await this.getContactsByUserId(userId);
    const createdContact = contacts.find(
      (c) => c.email === this.maskingService.maskEmail(createContactDto.email)
    );

    return createdContact;
  }

  async getContactsByUser(
    userId: string,
    page = 1,
    limit = 10,
    searchTerm?: string,
    sortBy?: ContactListSortBy,
    sortDir?: ContactListSortDir
  ) {
    if (page < 1) {
      throw new Error(CONTACTS_MESSAGES.ERROR.PAGE_MUST_BE_GREATER_THAN_0);
    }
    if (limit < 1 || limit > 100) {
      throw new Error(CONTACTS_MESSAGES.ERROR.LIMIT_MUST_BE_BETWEEN_1_AND_100);
    }

    let allContacts;
    if (searchTerm && searchTerm.trim() !== "") {
      allContacts = await this.searchContactsInternal(userId, searchTerm);
    } else {
      allContacts = await this.getContactsByUserId(userId);
    }

    sortContactsForList(allContacts, sortBy, sortDir);

    const totalContacts = allContacts.length;
    const totalPages = Math.max(1, Math.ceil(totalContacts / limit));

    // Clamp page to valid range
    const actualPage = Math.min(Math.max(1, page), totalPages);
    const offset = (actualPage - 1) * limit;
    const contacts = allContacts.slice(offset, offset + limit);

    // Convert S3 keys to full URLs for profile photos
    const contactsWithPhotos = await Promise.all(
      contacts.map(async (contact) => {
        const contactWithPhoto = {
          ...contact,
          profilePhotoUrl: contact.profilePhotoUrl || null,
        };
        await this.profilesService.convertProfilePhotoUrlToFullUrl(
          contactWithPhoto
        );
        return contactWithPhoto;
      })
    );

    // Strip phoneNumber from list response (phone data stays in DB, just hidden from UI)
    const contactsForResponse = contactsWithPhotos.map(
      ({ phoneNumber: _phoneNumber, ...rest }) => rest
    );

    return {
      contacts: contactsForResponse,
      pagination: {
        page: actualPage,
        limit,
        totalContacts,
        totalPages,
        hasNextPage: actualPage < totalPages,
        hasPrevPage: actualPage > 1,
      },
    };
  }

  async getContactByIdMinimal(
    contactId: number
  ): Promise<schema.Contact | undefined> {
    return await this.db.query.contacts.findFirst({
      where: eq(schema.contacts.id, contactId),
    });
  }

  /**
   * Get contact details for a request (used by introductions and disputes)
   */
  async getContactDetailsForRequest(contactId: number): Promise<
    | {
        id: number;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        company: string | null;
        title: string | null;
        linkedin: string | null;
        website: string | null;
        profilePhotoUrl: string | null;
        industry: string | null;
        location: string | null;
        employees: string | null;
        companyIndustry: string | null;
        companyDescription: string | null;
        linkedinConnections: string | null;
        companyLinkedinUrl: string | null;
      }
    | undefined
  > {
    const results = await this.db
      .select({
        id: schema.contacts.id,
        firstName: schema.contacts.firstName,
        lastName: schema.contacts.lastName,
        email: schema.contacts.email,
        company: schema.contacts.company,
        title: schema.contacts.title,
        linkedin: schema.contacts.linkedin,
        website: schema.contacts.website,
        profilePhotoUrl: schema.contacts.profilePhotoUrl,
        industry: schema.contacts.industry,
        location: schema.contacts.location,
        employees: schema.contacts.employees,
        companyIndustry: schema.contacts.companyIndustry,
        companyDescription: schema.contacts.companyDescription,
        linkedinConnections: schema.contacts.linkedinConnections,
        companyLinkedinUrl: schema.contacts.companyLinkedinUrl,
      })
      .from(schema.contacts)
      .where(eq(schema.contacts.id, contactId));

    return results[0];
  }

  async getContactById(userId: string, contactId: number) {
    // First check if user has access via contact_relationships (new system)
    // Use COALESCE to prioritize relationship-specific fields, fallback to main contact table
    const relationshipResults = await this.db
      .select({
        id: schema.contacts.id,
        firstName: sql<
          string | null
        >`COALESCE(${schema.contactRelationships.firstName}, ${schema.contacts.firstName})`.as(
          "firstName"
        ),
        lastName: sql<
          string | null
        >`COALESCE(${schema.contactRelationships.lastName}, ${schema.contacts.lastName})`.as(
          "lastName"
        ),
        title: sql<
          string | null
        >`COALESCE(${schema.contactRelationships.title}, ${schema.contacts.title})`.as(
          "title"
        ),
        company: sql<
          string | null
        >`COALESCE(${schema.contactRelationships.company}, ${schema.contacts.company})`.as(
          "company"
        ),

        email: schema.contacts.email,
        linkedin: schema.contacts.linkedin,
        profilePhotoUrl: schema.contacts.profilePhotoUrl,
        source: schema.contacts.source,
        originalImporterId: schema.contacts.originalImporterId,
        bountyAmount: schema.contactRelationships.bountyAmount,
        createdAt: schema.contacts.createdAt,
        updatedAt: schema.contacts.updatedAt,
        deletedAt: schema.contacts.deletedAt,
      })
      .from(schema.contacts)
      .innerJoin(
        schema.contactRelationships,
        eq(schema.contacts.id, schema.contactRelationships.contactId)
      )
      .where(
        and(
          eq(schema.contactRelationships.userId, userId),
          eq(schema.contacts.id, contactId),
          isNull(schema.contacts.deletedAt)
        )
      )
      .limit(1);

    if (relationshipResults.length > 0) {
      return relationshipResults[0];
    }

    // Fallback to direct userId check (backward compatibility for legacy contacts)
    const contact = await this.db.query.contacts.findFirst({
      where: and(
        eq(schema.contacts.id, contactId),
        eq(schema.contacts.originalImporterId, userId),
        isNull(schema.contacts.deletedAt)
      ),
    });

    if (!contact) {
      throw new NotFoundException(CONTACTS_MESSAGES.ERROR.CONTACT_NOT_FOUND);
    }

    return contact;
  }

  async updateContact(
    userId: string,
    contactId: number,
    updateData: Partial<CreateContactDto>
  ) {
    const { encryptContactFields, maskEmail, maskPhone } =
      await import("../../services/encryptionService");

    // Check if email already exists and prevent updating it if it does
    if (updateData.email !== undefined) {
      const existingSensitiveData = await this.db
        .select()
        .from(schema.contactSensitiveData)
        .where(eq(schema.contactSensitiveData.contactId, contactId))
        .limit(1);

      // Check if email exists (encrypted email field is not null)
      if (
        existingSensitiveData.length > 0 &&
        existingSensitiveData[0].email !== null
      ) {
        // Email already exists, throw error
        throw new BadRequestException(
          CONTACTS_MESSAGES.ERROR.EMAIL_ALREADY_EXISTS
        );
      }

      // Check if email is already used by another contact
      const emailExists = await this.checkEmailExistsForOtherContact(
        updateData.email
      );

      if (emailExists) {
        throw new BadRequestException(
          CONTACTS_MESSAGES.ERROR.EMAIL_ALREADY_IN_USE
        );
      }
    }

    // Use filtered update data
    const updateDataToUse = updateData;

    // Separate sensitive and non-sensitive data
    const sensitiveFields = {
      email: updateDataToUse.email,
      phone_number: updateDataToUse.phoneNumber,
      linkedin: updateDataToUse.linkedin,
      secondary_email: updateDataToUse.secondaryEmail,
    };

    const hasSensitiveData = Object.values(sensitiveFields).some(
      (val) => val !== undefined
    );

    // Check if relationship exists for this user and contact
    let existingRelationship = await this.db
      .select()
      .from(schema.contactRelationships)
      .where(
        and(
          eq(schema.contactRelationships.contactId, contactId),
          eq(schema.contactRelationships.userId, userId)
        )
      )
      .limit(1);

    // If relationship doesn't exist, create it
    if (existingRelationship.length === 0) {
      await this.db.insert(schema.contactRelationships).values({
        contactId,
        userId,
        bountyAmount: "0",
      });

      // Fetch the newly created relationship
      existingRelationship = await this.db
        .select()
        .from(schema.contactRelationships)
        .where(
          and(
            eq(schema.contactRelationships.contactId, contactId),
            eq(schema.contactRelationships.userId, userId)
          )
        )
        .limit(1);
    }

    // Prepare relationship-specific update data (firstName, lastName, company, title)
    const relationshipUpdateData: AnyType = {
      updatedAt: toUTC(),
    };

    if (updateDataToUse.firstName !== undefined) {
      relationshipUpdateData.firstName = updateDataToUse.firstName || null;
    }
    if (updateDataToUse.lastName !== undefined) {
      relationshipUpdateData.lastName = updateDataToUse.lastName || null;
    }
    if (updateDataToUse.company !== undefined) {
      relationshipUpdateData.company = updateDataToUse.company || null;
    }
    if (updateDataToUse.title !== undefined) {
      relationshipUpdateData.title = updateDataToUse.title || null;
    }

    // Update relationship-specific fields
    if (Object.keys(relationshipUpdateData).length > 1) {
      // More than just updatedAt
      await this.db
        .update(schema.contactRelationships)
        .set(relationshipUpdateData)
        .where(
          and(
            eq(schema.contactRelationships.contactId, contactId),
            eq(schema.contactRelationships.userId, userId)
          )
        );
    }

    // Prepare main contact update data (only for non-relationship-specific fields and sensitive fields)
    const contactUpdateData: AnyType = {
      updatedAt: toUTC(),
      isTypesenseSynced: false,
    };

    // Add masked values for any updated sensitive fields
    if (updateDataToUse.email !== undefined) {
      contactUpdateData.email = maskEmail(updateDataToUse.email);
    }
    if (updateDataToUse.phoneNumber !== undefined) {
      contactUpdateData.phoneNumber = updateDataToUse.phoneNumber
        ? maskPhone(updateDataToUse.phoneNumber)
        : null;
    }
    // LinkedIn is stored in both tables: plain text in contacts table for display, encrypted in contact_sensitive_data
    if (updateDataToUse.linkedin !== undefined) {
      contactUpdateData.linkedin = updateDataToUse.linkedin;
    }

    // Backfill NULL fields in contacts table with user-provided values (write-once).
    // Uses COALESCE to preserve existing non-NULL values — only fills when the column is NULL.
    if (updateDataToUse.firstName) {
      contactUpdateData.firstName = sql`COALESCE(${schema.contacts.firstName}, ${updateDataToUse.firstName})`;
    }
    if (updateDataToUse.lastName) {
      contactUpdateData.lastName = sql`COALESCE(${schema.contacts.lastName}, ${updateDataToUse.lastName})`;
    }
    if (updateDataToUse.company) {
      contactUpdateData.company = sql`COALESCE(${schema.contacts.company}, ${updateDataToUse.company})`;
    }
    if (updateDataToUse.title) {
      contactUpdateData.title = sql`COALESCE(${schema.contacts.title}, ${updateDataToUse.title})`;
    }

    // Remove undefined values
    Object.keys(contactUpdateData).forEach((key) => {
      if (contactUpdateData[key] === undefined) {
        delete contactUpdateData[key];
      }
    });

    // Update main contacts table (only if there are fields to update)
    if (Object.keys(contactUpdateData).length > 1) {
      // More than just updatedAt
      await this.db
        .update(schema.contacts)
        .set(contactUpdateData)
        .where(eq(schema.contacts.id, contactId));
    }

    // Update sensitive data if any sensitive fields were provided
    if (hasSensitiveData) {
      const encryptedFields = await encryptContactFields({
        email: updateDataToUse.email,
        phone_number: updateDataToUse.phoneNumber,
        linkedin: updateDataToUse.linkedin,
        secondary_email: updateDataToUse.secondaryEmail,
      });
      // Check if sensitive data record exists
      const existingSensitiveData = await this.db
        .select()
        .from(schema.contactSensitiveData)
        .where(eq(schema.contactSensitiveData.contactId, contactId))
        .limit(1);

      // Import encryption functions for normalized fields
      const {
        encryptNormalizedEmail,
        encryptNormalizedPhone,
        encryptNormalizedSecondaryEmail,
      } = await import("../../services/contactImportService");

      const sensitiveUpdateData: AnyType = {
        updatedAt: toUTC(),
      };

      // Only update fields that were explicitly provided in the update request
      // Check updateDataToUse (input) instead of encryptedFields (output) to avoid clearing existing data
      if (updateDataToUse.email !== undefined) {
        sensitiveUpdateData.email = encryptedFields.email;
        if (updateDataToUse.email) {
          sensitiveUpdateData.normalizedEmail = await encryptNormalizedEmail(
            updateDataToUse.email
          );
        }
      }
      if (updateDataToUse.phoneNumber !== undefined) {
        sensitiveUpdateData.phone = encryptedFields.phone;
        if (updateDataToUse.phoneNumber) {
          sensitiveUpdateData.normalizedPhone = await encryptNormalizedPhone(
            updateDataToUse.phoneNumber
          );
        }
      }
      if (updateDataToUse.linkedin !== undefined) {
        sensitiveUpdateData.linkedin = encryptedFields.linkedin;
      }
      if (updateDataToUse.secondaryEmail !== undefined) {
        sensitiveUpdateData.secondaryEmail = encryptedFields.secondaryEmail;
        // Also update normalized secondary email for efficient matching
        if (updateDataToUse.secondaryEmail) {
          sensitiveUpdateData.normalizedSecondaryEmail =
            await encryptNormalizedSecondaryEmail(
              updateDataToUse.secondaryEmail
            );
        }
      }

      if (existingSensitiveData.length > 0) {
        // Update existing sensitive data
        await this.db
          .update(schema.contactSensitiveData)
          .set(sensitiveUpdateData)
          .where(
            eq(schema.contactSensitiveData.id, existingSensitiveData[0].id)
          );
      } else {
        // Insert new sensitive data record
        // Only include fields that were explicitly provided in the update request
        const insertData: AnyType = {
          contactId,
        };

        if (updateDataToUse.email !== undefined) {
          insertData.email = encryptedFields.email;
          if (updateDataToUse.email) {
            insertData.normalizedEmail = await encryptNormalizedEmail(
              updateDataToUse.email
            );
          }
        }
        if (updateDataToUse.phoneNumber !== undefined) {
          insertData.phone = encryptedFields.phone;
          if (updateDataToUse.phoneNumber) {
            insertData.normalizedPhone = await encryptNormalizedPhone(
              updateDataToUse.phoneNumber
            );
          }
        }
        if (updateDataToUse.linkedin !== undefined) {
          insertData.linkedin = encryptedFields.linkedin;
        }
        if (updateDataToUse.secondaryEmail !== undefined) {
          insertData.secondaryEmail = encryptedFields.secondaryEmail;
          if (updateDataToUse.secondaryEmail) {
            insertData.normalizedSecondaryEmail =
              await encryptNormalizedSecondaryEmail(
                updateDataToUse.secondaryEmail
              );
          }
        }

        await this.db.insert(schema.contactSensitiveData).values(insertData);
      }
    }

    // Sync updated contact to Typesense
    try {
      await this.typesenseSyncQueueService?.enqueueSyncJob(
        [String(contactId)],
        userId,
        "manual_edit"
      );
    } catch (error) {
      this.logger.error(
        `CONTACTS_SERVICE :: UPDATE_CONTACT : TYPESENSE_SYNC_ERROR : ${error instanceof Error ? error.message : "Unknown error"}`
      );
      // Non-blocking — edit succeeds even if sync fails
    }

    // Return the updated contact
    return this.getContactById(userId, contactId);
  }

  async updateContactRelationshipBountyAmount(
    userId: string,
    contactId: number,
    bountyAmount: string
  ) {
    // Validate bounty amount: must be a valid whole number greater than 0
    const bountyValue = parseFloat(bountyAmount);

    if (isNaN(bountyValue)) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.INVALID_BOUNTY_AMOUNT
      );
    }

    // Validate: must be a whole number (no decimals)
    if (!Number.isInteger(bountyValue)) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.BOUNTY_AMOUNT_MUST_BE_WHOLE_NUMBER
      );
    }

    if (bountyValue <= 0) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.BOUNTY_AMOUNT_MUST_BE_POSITIVE
      );
    }

    // Validate: must not exceed maximum allowed (999,999) - Stripe limit
    const MAX_BOUNTY_AMOUNT = 999999;
    if (bountyValue > MAX_BOUNTY_AMOUNT) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.BOUNTY_AMOUNT_EXCEEDS_MAXIMUM(MAX_BOUNTY_AMOUNT)
      );
    }

    // First verify that a relationship exists for this user and contact
    const existingRelationship = await this.db
      .select()
      .from(schema.contactRelationships)
      .where(
        and(
          eq(schema.contactRelationships.contactId, contactId),
          eq(schema.contactRelationships.userId, userId)
        )
      )
      .limit(1);

    if (existingRelationship.length === 0) {
      throw new NotFoundException(
        CONTACTS_MESSAGES.ERROR.CONTACT_RELATIONSHIP_NOT_FOUND
      );
    }

    // Update the bounty_amount in contact_relationships
    await this.db
      .update(schema.contactRelationships)
      .set({
        bountyAmount,
        updatedAt: toUTC(),
      })
      .where(
        and(
          eq(schema.contactRelationships.contactId, contactId),
          eq(schema.contactRelationships.userId, userId)
        )
      );

    // Recalculate and update the median bounty amount in the contacts table
    await recalculateContactBountyMedian(contactId);

    this.logger.log(
      CONTACTS_MESSAGES.INFO.BOUNTY_AMOUNT_UPDATED(
        contactId,
        bountyAmount,
        userId
      )
    );

    return { success: true, bountyAmount };
  }

  async connectGoogleContacts(userId: string) {
    const { clientId, clientSecret, contactsScopes } = oauthConfig.google;

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.GOOGLE_OAUTH_NOT_CONFIGURED
      );
    }

    // Use frontend redirect URI with popup param - frontend will send code to backend for processing
    // The popup=1 param helps the callback page detect it was opened as a popup
    // even after cross-origin navigation clears window.opener
    const redirectUri = `${appConfig.apiUrl}/auth/google-contacts/callback`;

    const google = await import("googleapis");
    const oauth2Client = new google.google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Always force consent screen to allow fresh import process
    // This ensures users can re-initiate the import even if previous attempt failed
    // Include userinfo.email scope to get user's email address
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "select_account consent", // Force account selection and consent screen
      scope: [
        ...contactsScopes,
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      state: userId, // Pass userId in state for callback
    });

    return {
      authUrl,
      redirectUri,
    };
  }

  async getGoogleContactsImportStatus(userId: string) {
    // Check if user has tokens in contacts_provider_tokens
    const hasTokens = await this.contactsProviderTokensService.hasTokens(
      userId,
      "google"
    );

    // Get token record for email
    const tokenRecordId =
      await this.contactsProviderTokensService.getTokenRecordId(
        userId,
        "google"
      );
    const tokenRecord = tokenRecordId
      ? await this.contactsProviderTokensService.getTokenRecord(tokenRecordId)
      : null;

    const stats = await this.contactsImportService.getContactsImportStats(
      userId,
      "google"
    );

    if (!hasTokens && !stats.latestImport) {
      return {
        hasImport: false,
        connected: false,
        hasTokens: false,
      };
    }

    return {
      id: stats.latestImport?.id || null,
      hasImport: !!stats.latestImport,
      connected: hasTokens,
      hasTokens,
      status: stats.latestImport?.status || null,
      imported: stats.latestImport?.imported || 0,
      failed: stats.latestImport?.failed || 0,
      duplicates: stats.latestImport?.duplicates || 0,
      totalFetched: stats.latestImport?.totalFetched || 0,
      errorMessage: stats.latestImport?.errorMessage || null,
      startedAt: stats.latestImport?.startedAt || null,
      completedAt: stats.latestImport?.completedAt || null,
      createdAt: stats.latestImport?.createdAt || null,
      // Get email from token record first, then import record, then integration
      email:
        tokenRecord?.email ||
        stats.latestImport?.email ||
        stats.integration?.email ||
        null,
    };
  }

  async processGoogleContactsCallback(code: string, userId: string) {
    const { clientId, clientSecret, contactsScopes } = oauthConfig.google;

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.GOOGLE_OAUTH_NOT_CONFIGURED
      );
    }

    // Use frontend redirect URI with popup param (must match what's configured in Google Cloud Console)
    // The popup=1 param must match what was used in the authorization URL
    const redirectUri = `${appConfig.frontendUrl}/auth/google-contacts/callback`;

    const google = await import("googleapis");
    const oauth2Client = new google.google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.NO_ACCESS_TOKEN_FROM_GOOGLE
      );
    }

    // Check if at least one contacts scope was granted
    const hasContactsScope =
      contactsScopes.some((scope) => tokens.scope?.includes(scope)) || false;

    if (!hasContactsScope) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.CONTACTS_ACCESS_NOT_GRANTED
      );
    }

    const userEmail = await this.getGoogleUserEmail(
      tokens,
      oauth2Client,
      clientId
    );
    const normalizedEmail = normalizeImportAccountEmail(userEmail);
    if (!normalizedEmail) {
      throw new BadRequestException(
        "Could not determine your Google account email. Please ensure email permission is granted and try again."
      );
    }

    const profile = await this.profilesService.getProfile(userId);
    const isPrimary =
      !!profile?.email &&
      normalizeImportAccountEmail(profile.email) === normalizedEmail;

    const alreadyHadActiveGoogleImportAccount =
      await this.contactsProviderTokensService.hasActiveAccountForNormalizedEmail(
        userId,
        "google",
        normalizedEmail
      );

    let tokenRecordId: string | null = null;
    try {
      this.logger.log(
        CONTACTS_MESSAGES.INFO.ATTEMPTING_GOOGLE_TOKEN_UPDATE(userId)
      );

      tokenRecordId =
        await this.contactsProviderTokensService.getOrCreateTokenRecord(
          userId,
          "google",
          {
            accessToken: tokens.access_token || "",
            refreshToken: tokens.refresh_token || "",
            tokenExpiresAt: tokens.expiry_date
              ? toUTC(tokens.expiry_date)
              : undefined,
            email: normalizedEmail,
            isPrimary,
          }
        );
    } catch (error) {
      this.logger.error(
        CONTACTS_MESSAGES.ERROR.FAILED_TO_UPDATE_GOOGLE_TOKENS(userId),
        error instanceof Error ? error.stack : error
      );
      if (error instanceof ConflictException) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(
        `${CONTACTS_MESSAGES.ERROR.FAILED_TO_SAVE_GOOGLE_CONNECTION}: ${error instanceof Error ? error.message : CONTACTS_MESSAGES.ERROR.UNKNOWN_ERROR}`
      );
    }

    if (alreadyHadActiveGoogleImportAccount) {
      return {
        success: true,
        alreadyConnected: true,
        message: CONTACTS_MESSAGES.INFO.ACCOUNT_ALREADY_CONNECTED_IMPORT,
      };
    }

    // Create import record and queue job
    try {
      let importRecordId: string;
      try {
        importRecordId = await this.contactsImportService.createContactsImport({
          userId,
          provider: "google",
          tokenId: tokenRecordId,
          status: "pending",
          email: normalizedEmail,
        });
      } catch (error) {
        if (error instanceof ConflictException) {
          return {
            success: true,
            warning:
              CONTACTS_MESSAGES.ERROR.IMPORT_ALREADY_IN_PROGRESS("Google"),
          };
        }
        throw error;
      }

      // Queue background import job
      try {
        if (!this.googleContactsQueueService) {
          throw new Error("Background jobs disabled - Redis not configured");
        }
        const jobId = await this.googleContactsQueueService.queueImportJob(
          userId,
          importRecordId
        );
        this.logger.log(
          CONTACTS_MESSAGES.INFO.GOOGLE_IMPORT_QUEUED(
            jobId,
            userId,
            importRecordId
          )
        );
        return { success: true, jobId };
      } catch (error) {
        this.logger.error(
          CONTACTS_MESSAGES.ERROR.FAILED_TO_QUEUE_GOOGLE_IMPORT(
            userId,
            importRecordId
          ),
          error instanceof Error ? error.stack : error
        );
        return {
          success: true,
          warning: CONTACTS_MESSAGES.ERROR.IMPORT_QUEUING_FAILED,
        };
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        CONTACTS_MESSAGES.ERROR.FAILED_TO_CREATE_IMPORT_RECORD(userId),
        error instanceof Error ? error.stack : error
      );
      return {
        success: true,
        warning: `${CONTACTS_MESSAGES.ERROR.IMPORT_SETUP_FAILED}: ${error instanceof Error ? error.message : CONTACTS_MESSAGES.ERROR.UNKNOWN_ERROR}. You can retry the import.`,
      };
    }
  }

  /**
   * Get Google user email from id_token or userinfo API
   * @param tokens - Google OAuth tokens
   * @param oauth2Client - Google OAuth2 client instance
   * @param clientId - Google OAuth client ID
   * @returns User email or null if not available
   */
  private async getGoogleUserEmail(
    tokens: {
      id_token?: string;
      access_token?: string;
    },
    oauth2Client: {
      verifyIdToken: (options: {
        idToken: string;
        audience: string;
      }) => Promise<{ getPayload: () => { email?: string } | null }>;
    },
    clientId: string
  ): Promise<string | null> {
    return getGoogleUserEmailFromOAuthTokens(tokens, oauth2Client, clientId);
  }

  async resyncGoogleContacts(userId: string, tokenId?: string) {
    const hasTokens = await this.contactsProviderTokensService.hasTokens(
      userId,
      "google"
    );

    if (!hasTokens) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.GOOGLE_ACCOUNT_NOT_CONNECTED
      );
    }

    const tokenRecordId =
      tokenId ||
      (await this.contactsProviderTokensService.getTokenRecordId(
        userId,
        "google"
      ));

    if (!tokenRecordId) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.GOOGLE_ACCOUNT_NOT_CONNECTED
      );
    }

    if (tokenId) {
      await this.contactsProviderTokensService.assertTokenOwnedByUser(
        tokenRecordId,
        userId
      );
    }

    const tokenRecord =
      await this.contactsProviderTokensService.getTokenRecord(tokenRecordId);

    let importRecordId: string;
    try {
      importRecordId = await this.contactsImportService.createContactsImport({
        userId,
        provider: "google",
        tokenId: tokenRecordId,
        status: "pending",
        email: tokenRecord?.email || null,
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        return {
          success: true,
          warning: CONTACTS_MESSAGES.ERROR.IMPORT_ALREADY_IN_PROGRESS("Google"),
        };
      }
      throw error;
    }

    // Queue background import job using the new import record ID
    if (!this.googleContactsQueueService) {
      throw new BadRequestException(
        "Background jobs disabled - Redis not configured"
      );
    }
    const jobId = await this.googleContactsQueueService.queueImportJob(
      userId,
      importRecordId
    );

    return {
      success: true,
      message: CONTACTS_MESSAGES.INFO.GOOGLE_CONTACTS_RESYNC_QUEUED,
      jobId,
    };
  }

  /**
   * @deprecated Use connectAppleContacts instead for background import
   */
  async importAppleContacts(
    userId: string,
    appleId: string,
    appPassword: string
  ) {
    const { importAppleContacts } =
      await import("services/apple-contacts.service");
    // Note: apple-contacts.service expects params in order: appleId, appPassword, userId
    return importAppleContacts(appleId, appPassword, userId);
  }

  async connectAppleContacts(
    userId: string,
    appleId: string,
    appPassword: string
  ) {
    const normalizedAppleId = normalizeImportAccountEmail(appleId);
    if (!normalizedAppleId) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.APPLE_ID_PASSWORD_REQUIRED
      );
    }

    let tokenRecordId: string | null = null;
    try {
      tokenRecordId =
        await this.contactsProviderTokensService.getOrCreateTokenRecord(
          userId,
          "apple",
          {
            accessToken: appPassword,
            refreshToken: null,
            tokenExpiresAt: null,
            email: normalizedAppleId,
            isPrimary: true,
          }
        );
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(
        `${CONTACTS_MESSAGES.ERROR.FAILED_TO_SAVE_APPLE_CONNECTION}: ${error instanceof Error ? error.message : CONTACTS_MESSAGES.ERROR.UNKNOWN_ERROR}`
      );
    }

    // Create import record and queue job
    try {
      let importRecordId: string;
      try {
        importRecordId = await this.contactsImportService.createContactsImport({
          userId,
          provider: "apple",
          tokenId: tokenRecordId,
          status: "pending",
          email: normalizedAppleId,
        });
      } catch (error) {
        if (error instanceof ConflictException) {
          return {
            success: true,
            warning:
              CONTACTS_MESSAGES.ERROR.IMPORT_ALREADY_IN_PROGRESS("Apple"),
          };
        }
        throw error;
      }

      // Queue background import job
      try {
        if (!this.appleContactsQueueService) {
          throw new Error("Background jobs disabled - Redis not configured");
        }
        const jobId = await this.appleContactsQueueService.queueImportJob(
          userId,
          importRecordId
        );
        return { success: true, jobId };
      } catch (error) {
        this.logger.error(
          `❌ Failed to queue import job for user ${userId}, import record ${importRecordId}:`,
          error instanceof Error ? error.stack : error
        );
        return {
          success: true,
          warning: CONTACTS_MESSAGES.ERROR.IMPORT_QUEUING_FAILED,
        };
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      return {
        success: true,
        warning: `${CONTACTS_MESSAGES.ERROR.IMPORT_SETUP_FAILED}: ${error instanceof Error ? error.message : CONTACTS_MESSAGES.ERROR.UNKNOWN_ERROR}. You can retry the import.`,
      };
    }
  }

  async getAppleContactsImportStatus(userId: string) {
    // Check if user has active tokens in contacts_provider_tokens
    const hasTokens = await this.contactsProviderTokensService.hasTokens(
      userId,
      "apple"
    );

    // Get token record for email (including inactive ones to show error info)
    const tokenRecordId =
      await this.contactsProviderTokensService.getTokenRecordIdIncludingInactive(
        userId,
        "apple"
      );
    const tokenRecord = tokenRecordId
      ? await this.contactsProviderTokensService.getTokenRecord(tokenRecordId)
      : null;

    const stats = await this.contactsImportService.getContactsImportStats(
      userId,
      "apple"
    );

    // If no tokens and no import history, return empty state
    if (!tokenRecord && !stats.latestImport) {
      return {
        hasImport: false,
        connected: false,
        hasTokens: false,
      };
    }

    // Check if latest import failed with authentication error
    const _hasFailedImport =
      stats.latestImport?.status === "failed" &&
      stats.latestImport?.errorMessage &&
      (stats.latestImport.errorMessage.includes("Invalid Apple ID") ||
        stats.latestImport.errorMessage.includes("App-Specific Password") ||
        stats.latestImport.errorMessage.includes("authenticate") ||
        stats.latestImport.errorMessage.includes("401") ||
        stats.latestImport.errorMessage.includes("403"));

    return {
      hasImport: !!stats.latestImport,
      connected: hasTokens,
      hasTokens,
      status: stats.latestImport?.status || null,
      imported: stats.latestImport?.imported || 0,
      failed: stats.latestImport?.failed || 0,
      duplicates: stats.latestImport?.duplicates || 0,
      totalFetched: stats.latestImport?.totalFetched || 0,
      errorMessage: stats.latestImport?.errorMessage || null,
      startedAt: stats.latestImport?.startedAt || null,
      completedAt: stats.latestImport?.completedAt || null,
      createdAt: stats.latestImport?.createdAt || null,
      // Get email from token record first (even if inactive), then import record
      email: tokenRecord?.email || stats.latestImport?.email || null,
      // Indicate if tokens are inactive but we have error info
      tokensInactive: tokenRecord ? !tokenRecord.isActive : false,
    };
  }

  async resyncAppleContacts(userId: string, tokenId?: string) {
    const hasTokens = await this.contactsProviderTokensService.hasTokens(
      userId,
      "apple"
    );

    if (!hasTokens) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.APPLE_ACCOUNT_NOT_CONNECTED
      );
    }

    const tokenRecordId =
      tokenId ||
      (await this.contactsProviderTokensService.getTokenRecordId(
        userId,
        "apple"
      ));

    if (!tokenRecordId) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.APPLE_ACCOUNT_NOT_CONNECTED
      );
    }

    if (tokenId) {
      await this.contactsProviderTokensService.assertTokenOwnedByUser(
        tokenRecordId,
        userId
      );
    }

    const tokens =
      await this.contactsProviderTokensService.getTokensById(tokenRecordId);

    if (!tokens || !tokens.accessToken || !tokens.email) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.APPLE_CREDENTIALS_NOT_FOUND
      );
    }

    // Try to test credentials by attempting to fetch contacts
    // If this fails, we'll mark tokens as inactive and throw error
    try {
      const { fetchiCloudContacts } =
        await import("services/apple-contacts.service");
      // Test credentials with a minimal fetch (this will fail if credentials are invalid)
      await fetchiCloudContacts(tokens.email, tokens.accessToken);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : CONTACTS_MESSAGES.ERROR.UNKNOWN_ERROR;
      this.logger.error(
        `${CONTACTS_MESSAGES.WARNING.APPLE_CREDENTIALS_TEST_FAILED}: ${errorMessage}`
      );

      // Check if it's an authentication error
      if (
        errorMessage.includes("401") ||
        errorMessage.includes("403") ||
        errorMessage.includes("authenticate") ||
        errorMessage.includes("password")
      ) {
        // Mark tokens as inactive
        try {
          await this.contactsProviderTokensService.deactivateTokenById(
            tokenRecordId
          );
        } catch (deactivateError) {
          this.logger.error(
            `${CONTACTS_MESSAGES.WARNING.FAILED_TO_DEACTIVATE_TOKENS}: ${deactivateError instanceof Error ? deactivateError.message : CONTACTS_MESSAGES.ERROR.UNKNOWN_ERROR}`
          );
        }
        throw new BadRequestException(
          CONTACTS_MESSAGES.ERROR.INVALID_APPLE_CREDENTIALS
        );
      }
    }

    // Get token record for email
    const tokenRecord =
      await this.contactsProviderTokensService.getTokenRecord(tokenRecordId);

    // Create NEW import record (not updating existing one)
    let importRecordId: string;
    try {
      importRecordId = await this.contactsImportService.createContactsImport({
        userId,
        provider: "apple",
        tokenId: tokenRecordId,
        status: "pending",
        email: tokenRecord?.email || null,
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        return {
          success: true,
          warning: CONTACTS_MESSAGES.ERROR.IMPORT_ALREADY_IN_PROGRESS("Apple"),
        };
      }
      throw error;
    }

    // Queue background import job using the new import record ID
    if (!this.appleContactsQueueService) {
      throw new BadRequestException(
        "Background jobs disabled - Redis not configured"
      );
    }
    const jobId = await this.appleContactsQueueService.queueImportJob(
      userId,
      importRecordId
    );

    return {
      success: true,
      message: CONTACTS_MESSAGES.INFO.APPLE_CONTACTS_RESYNC_QUEUED,
      jobId,
    };
  }

  async importCSVContacts(
    userId: string,
    contactRows: AnyType[],
    source?: string
  ) {
    const { importContacts } =
      await import("../../services/contactImportService");
    // Note: importContacts() automatically filters disposable emails internally
    // so CSV imports benefit from validation without additional filtering here
    const result = await importContacts(contactRows, {
      userId,
      source: source || "csv",
    });

    try {
      await this.userConfigurationsService.updateUserConfiguration(userId, {
        hasImportedContacts: true,
      });
    } catch (error) {
      this.logger.error(
        `CONTACTS_SERVICE :: importCSVContacts :: HAS_IMPORTED_CONTACTS : ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Trigger trust score calculation for successful CSV import (including duplicates)
    // Duplicates also create contact_import_snapshots which count toward credits
    if (
      (result.imported > 0 || result.duplicates > 0) &&
      (source === "csv_import" || source === "csv")
    ) {
      try {
        await this.trustScoreQueueService.enqueueTrustScoreEvent(
          userId,
          "csv_manual_upload",
          { contactCount: result.imported + result.duplicates }
        );
      } catch (error) {
        this.logger.error(
          `Failed to queue trust score event for CSV import: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Sync imported + updated contacts to Typesense for search
    const allContactIdsToSync = [
      ...result.importedContactIds,
      ...result.updatedContactIds,
    ];
    if (allContactIdsToSync.length > 0) {
      try {
        await this.typesenseSyncQueueService?.enqueueSyncJob(
          allContactIdsToSync.map(String),
          userId,
          "csv_import"
        );
      } catch (error) {
        this.logger.error(
          `Failed to queue typesense sync: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return result;
  }

  /**
   * Upload a contact photo to S3 and return the S3 key
   */
  private async uploadContactPhotoToS3(
    userId: string,
    contactId: string,
    photoBuffer: Buffer,
    mimeType: string
  ): Promise<string | null> {
    if (!this.s3Service?.isS3Available()) {
      return null;
    }

    try {
      const extension = mimeType.includes("png") ? "png" : "jpg";
      const key = `contacts/${userId}/${contactId}.${extension}`;
      await this.s3Service.uploadBuffer(key, photoBuffer, mimeType);
      return key;
    } catch (error) {
      this.logger.warn(
        `Failed to upload photo to S3 for contact ${contactId}: ${error}`
      );
      return null;
    }
  }

  async importMicrosoftContacts(
    userId: string,
    code: string,
    redirectUri: string
  ) {
    const { clientId } = oauthConfig.microsoft;
    const { clientSecret } = oauthConfig.microsoft;

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.MICROSOFT_IMPORT_NOT_CONFIGURED
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(oauthConfig.microsoft.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: oauthConfig.microsoft.contactsScopes.join(" "),
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(
        `${CONTACTS_MESSAGES.ERROR.FAILED_TO_EXCHANGE_CODE}: ${errorText}`
      );
    }

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      throw new Error(CONTACTS_MESSAGES.ERROR.NO_ACCESS_TOKEN_FROM_MICROSOFT);
    }

    const accessToken = tokens.access_token;

    // Fetch contacts from Microsoft Graph API
    const contactsResponse = await fetch(
      `${oauthConfig.microsoft.graphApiBaseUrl}/me/contacts?$top=999`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!contactsResponse.ok) {
      const errorText = await contactsResponse.text();
      throw new Error(
        `${CONTACTS_MESSAGES.ERROR.FAILED_TO_FETCH_MICROSOFT_CONTACTS}: ${errorText}`
      );
    }

    const contactsData = await contactsResponse.json();

    if (!contactsData.value || contactsData.value.length === 0) {
      return {
        success: true,
        message: CONTACTS_MESSAGES.INFO.NO_CONTACTS_FOUND,
        imported: 0,
        updated: 0,
        total: 0,
      };
    }

    // Transform Microsoft contacts to our format
    // Track contacts with photos for later fetching
    const contactsToImport: AnyType[] = [];
    const contactsWithPhotos: Map<string, number> = new Map();

    for (const contact of contactsData.value) {
      const email = contact.emailAddresses?.[0]?.address || null;
      const phone =
        contact.mobilePhone ||
        contact.businessPhones?.[0] ||
        contact.homePhones?.[0] ||
        null;
      const givenName = contact.givenName || null;
      const surname = contact.surname || null;
      const company = contact.companyName || null;
      const title = contact.jobTitle || null;
      const city =
        contact.homeAddress?.city || contact.businessAddress?.city || null;
      const state =
        contact.homeAddress?.state || contact.businessAddress?.state || null;
      const country =
        contact.homeAddress?.countryOrRegion ||
        contact.businessAddress?.countryOrRegion ||
        null;
      const hasPhoto = !!contact.id;

      // Require email or phone (at least one identifier)
      if (!email && !phone) {
        continue;
      }

      const contactIndex = contactsToImport.length;
      contactsToImport.push({
        first_name: givenName,
        last_name: surname,
        email,
        phone_number: phone,
        company,
        title,
        linkedin: null,
        city,
        state,
        country,
        profile_photo_url: undefined,
      });

      // Track contacts for photo fetching; we'll ignore 404s
      if (hasPhoto && contact.id) {
        contactsWithPhotos.set(contact.id, contactIndex);
      }
    }

    if (contactsToImport.length === 0) {
      return {
        success: true,
        message: CONTACTS_MESSAGES.INFO.NO_CONTACTS_WITH_DETAILS_FOUND,
        imported: 0,
        updated: 0,
        total: contactsData.value.length,
      };
    }

    // Fetch and upload photos for contacts that have them
    if (contactsWithPhotos.size > 0 && this.s3Service?.isS3Available()) {
      this.logger.log(
        `Fetching photos for ${contactsWithPhotos.size} contacts...`
      );

      let photosProcessed = 0;
      let photosUploaded = 0;

      // Process photos in batches to avoid overwhelming the API
      const batchSize = 10;
      const contactIds = Array.from(contactsWithPhotos.keys());

      for (let i = 0; i < contactIds.length; i += batchSize) {
        const batch = contactIds.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (microsoftContactId) => {
            const contactIndex = contactsWithPhotos.get(microsoftContactId);
            if (contactIndex === undefined) return;

            const photoData = await fetchMicrosoftContactPhoto(
              accessToken,
              microsoftContactId,
              this.logger
            );

            if (photoData) {
              const s3Key = await this.uploadContactPhotoToS3(
                userId,
                microsoftContactId,
                photoData.buffer,
                photoData.mimeType
              );

              if (s3Key) {
                contactsToImport[contactIndex].profile_photo_url = s3Key;
                photosUploaded++;
              }
            }
            photosProcessed++;
          })
        );
      }

      this.logger.log(
        `Processed ${photosProcessed} photos, uploaded ${photosUploaded} to S3`
      );
    } else {
      this.logger.log(
        `No photos to fetch for ${contactsToImport.length} contacts`
      );
    }

    // Use centralized import service with encryption
    const { importContacts } =
      await import("../../services/contactImportService");

    const result = await importContacts(contactsToImport, {
      userId,
      source: "Microsoft",
      allowUpdates: true,
    });

    return {
      success: true,
      imported: result.imported,
      updated: result.updated,
      errors: result.errors,
      errorMessages: result.errorMessages,
      total: contactsData.value.length,
    };
  }

  async connectMicrosoftContacts(userId: string) {
    const { clientId, clientSecret, contactsScopes } = oauthConfig.microsoft;

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.MICROSOFT_OAUTH_NOT_CONFIGURED
      );
    }

    // Use frontend redirect URI with popup param - frontend will send code to backend for processing
    // The popup=1 param helps the callback page detect it was opened as a popup
    // even after cross-origin navigation clears window.opener
    const redirectUri = `${appConfig.frontendUrl}/auth/microsoft/callback`;

    // Build Microsoft OAuth URL
    const authUrl =
      `${oauthConfig.microsoft.authorizeEndpoint}?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(contactsScopes.join(" "))}&` +
      `response_mode=query&` +
      `state=${userId}&` + // Pass userId in state for callback
      `prompt=consent`; // Force consent screen

    return {
      authUrl,
      redirectUri,
    };
  }

  async getMicrosoftContactsImportStatus(userId: string) {
    // Check if user has tokens in contacts_provider_tokens
    const hasTokens = await this.contactsProviderTokensService.hasTokens(
      userId,
      "microsoft"
    );

    // Get token record for email
    const tokenRecordId =
      await this.contactsProviderTokensService.getTokenRecordId(
        userId,
        "microsoft"
      );
    const tokenRecord = tokenRecordId
      ? await this.contactsProviderTokensService.getTokenRecord(tokenRecordId)
      : null;

    const stats = await this.contactsImportService.getContactsImportStats(
      userId,
      "microsoft"
    );

    if (!hasTokens && !stats.latestImport) {
      return {
        hasImport: false,
        connected: false,
        hasTokens: false,
      };
    }

    return {
      hasImport: !!stats.latestImport,
      connected: hasTokens,
      hasTokens,
      status: stats.latestImport?.status || null,
      imported: stats.latestImport?.imported || 0,
      failed: stats.latestImport?.failed || 0,
      duplicates: stats.latestImport?.duplicates || 0,
      totalFetched: stats.latestImport?.totalFetched || 0,
      errorMessage: stats.latestImport?.errorMessage || null,
      startedAt: stats.latestImport?.startedAt || null,
      completedAt: stats.latestImport?.completedAt || null,
      createdAt: stats.latestImport?.createdAt || null,
      // Get email from token record first, then import record
      email: tokenRecord?.email || stats.latestImport?.email || null,
    };
  }

  async processMicrosoftContactsCallback(code: string, userId: string) {
    const { clientId, clientSecret, contactsScopes } = oauthConfig.microsoft;

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.MICROSOFT_OAUTH_NOT_CONFIGURED
      );
    }

    // Use frontend redirect URI with popup param (must match what's configured in Microsoft Azure Portal)
    // The popup=1 param must match what was used in the authorization URL
    const redirectUri = `${appConfig.frontendUrl}/auth/microsoft/callback`;

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(oauthConfig.microsoft.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: contactsScopes.join(" "),
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new BadRequestException(
        `${CONTACTS_MESSAGES.ERROR.FAILED_TO_EXCHANGE_CODE}: ${errorText}`
      );
    }

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.NO_ACCESS_TOKEN_FROM_MICROSOFT
      );
    }

    // Get user email from Microsoft Graph API
    let userEmail: string | null = null;
    try {
      const userResponse = await fetch(
        `${oauthConfig.microsoft.graphApiBaseUrl}/me`,
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        }
      );

      if (userResponse.ok) {
        const userData = await userResponse.json();
        userEmail = userData.mail || userData.userPrincipalName || null;
      } else {
        throw new BadRequestException(
          CONTACTS_MESSAGES.ERROR.FAILED_TO_FETCH_MICROSOFT_USER
        );
      }
    } catch (error) {
      this.logger.error(
        `CONTACTS_SERVICE :: PROCESS_MICROSOFT_CONTACTS_CALLBACK : ERROR : ${error instanceof Error ? error.message : CONTACTS_MESSAGES.ERROR.UNKNOWN_ERROR}`
      );
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.FAILED_TO_FETCH_MICROSOFT_USER
      );
    }

    const tokenExpiresAt = tokens.expires_in
      ? toUTC(toUTC().valueOf() + tokens.expires_in * 1000)
      : undefined;

    const normalizedEmail = normalizeImportAccountEmail(userEmail);
    if (!normalizedEmail) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.FAILED_TO_FETCH_MICROSOFT_USER
      );
    }

    const profile = await this.profilesService.getProfile(userId);
    const isPrimary =
      !!profile?.email &&
      normalizeImportAccountEmail(profile.email) === normalizedEmail;

    const alreadyHadActiveMicrosoftImportAccount =
      await this.contactsProviderTokensService.hasActiveAccountForNormalizedEmail(
        userId,
        "microsoft",
        normalizedEmail
      );

    let tokenRecordId: string | null = null;
    try {
      tokenRecordId =
        await this.contactsProviderTokensService.getOrCreateTokenRecord(
          userId,
          "microsoft",
          {
            accessToken: tokens.access_token || "",
            refreshToken: tokens.refresh_token || "",
            tokenExpiresAt,
            email: normalizedEmail,
            isPrimary,
          }
        );
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(
        `${CONTACTS_MESSAGES.ERROR.FAILED_TO_SAVE_MICROSOFT_CONNECTION}: ${error instanceof Error ? error.message : CONTACTS_MESSAGES.ERROR.UNKNOWN_ERROR}`
      );
    }

    if (alreadyHadActiveMicrosoftImportAccount) {
      return {
        success: true,
        alreadyConnected: true,
        message: CONTACTS_MESSAGES.INFO.ACCOUNT_ALREADY_CONNECTED_IMPORT,
      };
    }

    // Create import record and queue job
    try {
      let importRecordId: string;
      try {
        importRecordId = await this.contactsImportService.createContactsImport({
          userId,
          provider: "microsoft",
          tokenId: tokenRecordId,
          status: "pending",
          email: normalizedEmail,
        });
      } catch (error) {
        if (error instanceof ConflictException) {
          return {
            success: true,
            warning:
              CONTACTS_MESSAGES.ERROR.IMPORT_ALREADY_IN_PROGRESS("Microsoft"),
          };
        }
        throw error;
      }

      // Queue background import job
      try {
        if (!this.microsoftContactsQueueService) {
          throw new Error("Background jobs disabled - Redis not configured");
        }
        const jobId = await this.microsoftContactsQueueService.queueImportJob(
          userId,
          importRecordId
        );
        return { success: true, jobId };
      } catch (error) {
        this.logger.error(
          `❌ Failed to queue import job for user ${userId}, import record ${importRecordId}:`,
          error instanceof Error ? error.stack : error
        );
        return {
          success: true,
          warning: CONTACTS_MESSAGES.ERROR.IMPORT_QUEUING_FAILED,
        };
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      return {
        success: true,
        warning: `${CONTACTS_MESSAGES.ERROR.IMPORT_SETUP_FAILED}: ${error instanceof Error ? error.message : CONTACTS_MESSAGES.ERROR.UNKNOWN_ERROR}. You can retry the import.`,
      };
    }
  }

  async resyncMicrosoftContacts(userId: string, tokenId?: string) {
    const hasTokens = await this.contactsProviderTokensService.hasTokens(
      userId,
      "microsoft"
    );

    if (!hasTokens) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.MICROSOFT_ACCOUNT_NOT_CONNECTED
      );
    }

    const tokenRecordId =
      tokenId ||
      (await this.contactsProviderTokensService.getTokenRecordId(
        userId,
        "microsoft"
      ));

    if (!tokenRecordId) {
      throw new BadRequestException(
        CONTACTS_MESSAGES.ERROR.MICROSOFT_ACCOUNT_NOT_CONNECTED
      );
    }

    if (tokenId) {
      await this.contactsProviderTokensService.assertTokenOwnedByUser(
        tokenRecordId,
        userId
      );
    }

    const tokenRecord =
      await this.contactsProviderTokensService.getTokenRecord(tokenRecordId);

    let importRecordId: string;
    try {
      importRecordId = await this.contactsImportService.createContactsImport({
        userId,
        provider: "microsoft",
        tokenId: tokenRecordId,
        status: "pending",
        email: tokenRecord?.email || null,
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        return {
          success: true,
          warning:
            CONTACTS_MESSAGES.ERROR.IMPORT_ALREADY_IN_PROGRESS("Microsoft"),
        };
      }
      throw error;
    }

    // Queue background import job using the new import record ID
    if (!this.microsoftContactsQueueService) {
      throw new BadRequestException(
        "Background jobs disabled - Redis not configured"
      );
    }
    const jobId = await this.microsoftContactsQueueService.queueImportJob(
      userId,
      importRecordId
    );

    return {
      success: true,
      message: CONTACTS_MESSAGES.INFO.MICROSOFT_CONTACTS_RESYNC_QUEUED,
      jobId,
    };
  }

  async listContactImportAccounts(userId: string, provider?: string) {
    const accounts =
      await this.contactsProviderTokensService.listImportAccounts(
        userId,
        provider
      );
    const max = appConfig.contactImportMaxAccountsPerProvider;
    const enriched = await Promise.all(
      accounts.map(async (a) => {
        const latest = await this.contactsImportService.getLatestContactsImport(
          userId,
          a.provider,
          a.id
        );
        return {
          id: a.id,
          provider: a.provider,
          email: a.email,
          isPrimary: a.isPrimary,
          isActive: a.isActive,
          tokenExpiresAt: a.tokenExpiresAt,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          latestImport: latest
            ? {
                id: latest.id,
                status: latest.status,
                imported: latest.imported,
                failed: latest.failed,
                duplicates: latest.duplicates,
                totalFetched: latest.totalFetched,
                errorMessage: latest.errorMessage,
                startedAt: latest.startedAt,
                completedAt: latest.completedAt,
                createdAt: latest.createdAt,
              }
            : null,
        };
      })
    );

    const createdAtMs = (v: Date | string) =>
      v instanceof Date ? v.getTime() : new Date(v).getTime();

    enriched.sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      if (a.isPrimary !== b.isPrimary) {
        return a.isPrimary ? -1 : 1;
      }
      return createdAtMs(b.createdAt) - createdAtMs(a.createdAt);
    });

    const combinedLatestImportTotals = enriched.reduce(
      (acc, row) => ({
        totalFetched: acc.totalFetched + (row.latestImport?.totalFetched ?? 0),
        imported: acc.imported + (row.latestImport?.imported ?? 0),
        duplicates: acc.duplicates + (row.latestImport?.duplicates ?? 0),
      }),
      { totalFetched: 0, imported: 0, duplicates: 0 }
    );

    return {
      maxAccountsPerProvider: max,
      accounts: enriched,
      combinedLatestImportTotals,
    };
  }

  async disconnectContactImportAccount(userId: string, tokenId: string) {
    await this.contactsProviderTokensService.assertTokenOwnedByUser(
      tokenId,
      userId
    );
    const tokenRow =
      await this.contactsProviderTokensService.getTokenRecord(tokenId);
    if (tokenRow?.isPrimary) {
      throw new BadRequestException(
        "The primary import account cannot be disconnected."
      );
    }
    try {
      await this.contactsProviderTokensService.deactivateTokenById(tokenId);
    } catch (deactivateError) {
      this.logger.error(
        `Failed to deactivate token ${tokenId}: ${deactivateError instanceof Error ? deactivateError.message : String(deactivateError)}`
      );
      throw deactivateError;
    }
    return { success: true };
  }

  async resyncContactImportAccount(userId: string, tokenId: string) {
    await this.contactsProviderTokensService.assertTokenOwnedByUser(
      tokenId,
      userId
    );
    const row =
      await this.contactsProviderTokensService.getTokenRecord(tokenId);
    if (!row) {
      throw new NotFoundException("Import account not found.");
    }

    if (!row.isActive) {
      throw new BadRequestException("Import account is disconnected.");
    }

    switch (row.provider) {
      case "google":
        return this.resyncGoogleContacts(userId, tokenId);
      case "microsoft":
        return this.resyncMicrosoftContacts(userId, tokenId);
      case "apple":
        return this.resyncAppleContacts(userId, tokenId);
      default:
        throw new BadRequestException("Unsupported provider for resync.");
    }
  }

  async generateLinkedInZipUploadUrl(
    userId: string,
    fileMeta: { fileName: string; fileSize: number }
  ) {
    const { uploadUrl, key, expiresIn } =
      await this.s3Service.generatePresignedPutUrlForLinkedInZip(
        userId,
        fileMeta.fileName,
        fileMeta.fileSize
      );

    return {
      uploadUrl,
      key,
      expiresIn,
    };
  }

  async processLinkedInZipUpload(userId: string, s3Key: string) {
    // Check if there is already an active import for this user and provider
    const hasActive = await this.contactsImportService.hasActiveImport(
      userId,
      "linkedin"
    );
    if (hasActive) {
      throw new ConflictException(
        "LinkedIn contacts import is already in progress. Please wait for the current import to complete."
      );
    }

    // Create import record
    let importRecordId: string;
    try {
      importRecordId = await this.contactsImportService.createContactsImport({
        userId,
        provider: "linkedin",
        status: "pending",
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        return {
          success: true,
          warning:
            CONTACTS_MESSAGES.ERROR.IMPORT_ALREADY_IN_PROGRESS("LinkedIn"),
        };
      }
      throw error;
    }

    // Create linkedin_imports record
    await this.db
      .insert(schema.linkedinImports)
      .values({
        userId,
        importRecordId,
        s3Key,
        extractionLog: {},
        processingLog: {},
      })
      .returning({ id: schema.linkedinImports.id });

    // Queue background import job
    try {
      if (!this.linkedinContactsQueueService) {
        throw new Error("Background jobs disabled - Redis not configured");
      }
      const jobId = await this.linkedinContactsQueueService.queueImportJob(
        userId,
        importRecordId,
        s3Key
      );
      this.logger.log(
        `LinkedIn import queued: jobId=${jobId}, userId=${userId}, importRecordId=${importRecordId}`
      );
      return { success: true, jobId, importRecordId };
    } catch (error) {
      this.logger.error(
        `Failed to queue LinkedIn import job for user ${userId}, import record ${importRecordId}:`,
        error instanceof Error ? error.stack : error
      );
      return {
        success: true,
        warning: CONTACTS_MESSAGES.ERROR.IMPORT_QUEUING_FAILED,
      };
    }
  }

  async getLinkedInImportStatus(userId: string, importRecordId: string) {
    // Get import record
    const importRecord =
      await this.contactsImportService.getContactsImportById(importRecordId);

    if (!importRecord) {
      throw new NotFoundException("Import record not found");
    }

    // Verify it belongs to the user
    if (importRecord.userId !== userId) {
      throw new NotFoundException("Import record not found");
    }

    // Get linkedin_imports record
    const linkedinImport = await this.db.query.linkedinImports.findFirst({
      where: eq(schema.linkedinImports.importRecordId, importRecordId),
    });

    return {
      importRecord: {
        id: importRecord.id,
        status: importRecord.status,
        imported: importRecord.imported,
        failed: importRecord.failed,
        duplicates: importRecord.duplicates,
        totalFetched: importRecord.totalFetched,
        errorMessage: importRecord.errorMessage,
        startedAt: importRecord.startedAt,
        completedAt: importRecord.completedAt,
        createdAt: importRecord.createdAt,
      },
      linkedinImport: linkedinImport
        ? {
            id: linkedinImport.id,
            linkedinProfileUrl: linkedinImport.linkedinProfileUrl,
            profileData: linkedinImport.profileData,
            extractionLog: linkedinImport.extractionLog,
            processingLog: linkedinImport.processingLog,
          }
        : null,
    };
  }
}
