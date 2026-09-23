import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq, and, or, isNull } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";
import {
  encryptContactFields,
  maskEmail,
  maskPhone,
} from "services/encryptionService";
import {
  encryptNormalizedEmail,
  encryptNormalizedPhone,
  encryptNormalizedSecondaryEmail,
  normalizeEmail,
} from "services/contactImportService";
import {
  generateContactHashes,
  hashData,
  normalizeLinkedIn,
} from "services/contactMatchingService";
import type { ApolloMatchPerson } from "../contact-enrichment.types";
import type { Contact } from "database/schema/contacts";
import { CONTACT_ENRICHMENT_CONSTANTS } from "../contact-enrichment.constants";
import {
  mapApolloToContactFields,
  fillNullableFields,
  stripPersonPiiFromResponse,
} from "../contact-enrichment.helpers";

type DrizzleDb = typeof import("database/db").db;
type DbTransaction = Parameters<Parameters<DrizzleDb["transaction"]>[0]>[0];

@Injectable()
export class ContactEnrichmentDbService {
  private readonly logger = new Logger(ContactEnrichmentDbService.name);

  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDb) {}

  async getContactById(contactId: number): Promise<Contact | null> {
    const result = await this.db
      .select({
        id: schema.contacts.id,
        firstName: schema.contacts.firstName,
        lastName: schema.contacts.lastName,
        gender: schema.contacts.gender,
        title: schema.contacts.title,
        company: schema.contacts.company,
        phoneNumber: schema.contacts.phoneNumber,
        email: schema.contacts.email,
        employees: schema.contacts.employees,
        industry: schema.contacts.industry,
        linkedin: schema.contacts.linkedin,
        website: schema.contacts.website,
        city: schema.contacts.city,
        state: schema.contacts.state,
        country: schema.contacts.country,
        companyDomain: schema.contacts.companyDomain,
        companyIndustry: schema.contacts.companyIndustry,
        companyDescription: schema.contacts.companyDescription,
        companyType: schema.contacts.companyType,
        location: schema.contacts.location,
        companyLinkedinUrl: schema.contacts.companyLinkedinUrl,
        corporatePhoneNumber: schema.contacts.corporatePhoneNumber,
        profilePhotoUrl: schema.contacts.profilePhotoUrl,
        linkedinConnections: schema.contacts.linkedinConnections,
        skills: schema.contacts.skills,
        source: schema.contacts.source,
        originalImporterId: schema.contacts.originalImporterId,
        bountyAmount: schema.contacts.bountyAmount,
        enrichmentId: schema.contacts.enrichmentId,
        embedding: schema.contacts.embedding,
        createdAt: schema.contacts.createdAt,
        updatedAt: schema.contacts.updatedAt,
        deletedAt: schema.contacts.deletedAt,
      })
      .from(schema.contacts)
      .where(
        and(
          eq(schema.contacts.id, contactId),
          isNull(schema.contacts.deletedAt)
        )
      )
      .limit(1);

    return (result[0] as Contact) ?? null;
  }

  /**
   * Check if a contact has already been enriched.
   * Returns the enrichment status or null if no record exists.
   */
  async getEnrichmentStatus(contactId: number): Promise<string | null> {
    const result = await this.db
      .select({
        enrichmentStatus: schema.contactEnrichments.enrichmentStatus,
      })
      .from(schema.contactEnrichments)
      .where(eq(schema.contactEnrichments.contactId, contactId))
      .limit(1);

    return result[0]?.enrichmentStatus ?? null;
  }

  /**
   * Find an existing contact by normalized LinkedIn hash or email hash.
   * Step 1: Normalize LinkedIn URL → hash → lookup.
   * Step 2 (fallback): Check ALL extracted emails against primary + secondary hashes.
   */
  async findExistingContact(
    linkedinUrl?: string,
    emails?: string[]
  ): Promise<number | null> {
    // Step 1: LinkedIn hash lookup (normalized)
    if (linkedinUrl) {
      const normalizedSlug = normalizeLinkedIn(linkedinUrl);
      const linkedinHash = hashData(normalizedSlug);

      if (linkedinHash) {
        const result = await this.db
          .select({ contactId: schema.contactSensitiveData.contactId })
          .from(schema.contactSensitiveData)
          .where(eq(schema.contactSensitiveData.linkedinHash, linkedinHash))
          .limit(1);

        if (result[0]) return result[0].contactId;
      }
    }

    // Step 2: Email hash fallback — check each extracted email against primary + secondary
    if (emails && emails.length > 0) {
      for (const email of emails) {
        const normalizedAddr = normalizeEmail(email);
        const emailHash = hashData(normalizedAddr);

        if (emailHash) {
          const result = await this.db
            .select({ contactId: schema.contactSensitiveData.contactId })
            .from(schema.contactSensitiveData)
            .where(
              or(
                eq(schema.contactSensitiveData.normalizedEmailHash, emailHash),
                eq(
                  schema.contactSensitiveData.normalizedSecondaryEmailHash,
                  emailHash
                )
              )
            )
            .limit(1);

          if (result[0]) return result[0].contactId;
        }
      }
    }

    return null;
  }

  /**
   * Update only the nullable fields on an existing contact.
   * Never overwrites fields that already have values.
   */
  async updateContactNullableFields(
    tx: DbTransaction,
    contactId: number,
    apolloData: ApolloMatchPerson,
    extractedEmails?: string[]
  ): Promise<void> {
    const existing = await tx
      .select({
        firstName: schema.contacts.firstName,
        lastName: schema.contacts.lastName,
        title: schema.contacts.title,
        company: schema.contacts.company,
        city: schema.contacts.city,
        state: schema.contacts.state,
        country: schema.contacts.country,
        location: schema.contacts.location,
        linkedin: schema.contacts.linkedin,
        profilePhotoUrl: schema.contacts.profilePhotoUrl,
        companyDomain: schema.contacts.companyDomain,
        companyIndustry: schema.contacts.companyIndustry,
        companyDescription: schema.contacts.companyDescription,
        companyLinkedinUrl: schema.contacts.companyLinkedinUrl,
        employees: schema.contacts.employees,
        website: schema.contacts.website,
        email: schema.contacts.email,
      })
      .from(schema.contacts)
      .where(eq(schema.contacts.id, contactId))
      .limit(1);

    if (!existing[0]) return;

    const mapped = mapApolloToContactFields(apolloData);
    const updates = fillNullableFields(existing[0], mapped);

    // Fill masked email if null and we have extracted emails
    if (!existing[0].email && extractedEmails && extractedEmails.length > 0) {
      updates.email = maskEmail(extractedEmails[0]);
    }

    if (Object.keys(updates).length === 0) return;

    await tx
      .update(schema.contacts)
      .set({ ...updates, updatedAt: toUTC(), isTypesenseSynced: false })
      .where(eq(schema.contacts.id, contactId));
  }

  /**
   * Create a new contact from Apollo enrichment data.
   * Returns the new contact ID.
   */
  async createNewContact(
    tx: DbTransaction,
    apolloData: ApolloMatchPerson,
    extractedEmails?: string[]
  ): Promise<number> {
    const mapped = mapApolloToContactFields(apolloData);
    const bestEmail = extractedEmails?.[0] ?? apolloData.email;
    const maskedEmail = bestEmail ? maskEmail(bestEmail) : null;
    const maskedPhone = apolloData.phone ? maskPhone(apolloData.phone) : null;

    const [created] = await tx
      .insert(schema.contacts)
      .values({
        ...mapped,
        source: CONTACT_ENRICHMENT_CONSTANTS.CONTACT_SOURCE,
        email: maskedEmail,
        phoneNumber: maskedPhone,
        createdAt: toUTC(),
        updatedAt: toUTC(),
      })
      .returning({ id: schema.contacts.id });

    return created.id;
  }

  /**
   * Create or update contact_sensitive_data for a contact.
   * If entry exists, only fills nullable encrypted fields.
   * If not, creates a new entry with all encrypted data.
   */
  async upsertSensitiveData(
    tx: DbTransaction,
    contactId: number,
    apolloData: ApolloMatchPerson,
    extractedEmails?: string[]
  ): Promise<void> {
    const existing = await tx
      .select({
        id: schema.contactSensitiveData.id,
        email: schema.contactSensitiveData.email,
        phone: schema.contactSensitiveData.phone,
        linkedin: schema.contactSensitiveData.linkedin,
        secondaryEmail: schema.contactSensitiveData.secondaryEmail,
        normalizedEmail: schema.contactSensitiveData.normalizedEmail,
        normalizedPhone: schema.contactSensitiveData.normalizedPhone,
        normalizedEmailHash: schema.contactSensitiveData.normalizedEmailHash,
        normalizedPhoneHash: schema.contactSensitiveData.normalizedPhoneHash,
        linkedinHash: schema.contactSensitiveData.linkedinHash,
      })
      .from(schema.contactSensitiveData)
      .where(eq(schema.contactSensitiveData.contactId, contactId))
      .limit(1);

    // Use first extracted email as primary candidate, fall back to apolloData.email
    const primaryEmailCandidate = extractedEmails?.[0] ?? apolloData.email;

    const encrypted = await encryptContactFields({
      email: primaryEmailCandidate,
      phone_number: apolloData.phone,
      linkedin: apolloData.linkedin_url,
    });

    const hashes = generateContactHashes({
      email: primaryEmailCandidate,
      phone: apolloData.phone,
      linkedin: apolloData.linkedin_url,
    });

    const encNormalizedEmail = await encryptNormalizedEmail(
      primaryEmailCandidate
    );
    const encNormalizedPhone = await encryptNormalizedPhone(apolloData.phone);

    if (existing[0]) {
      const updates: Record<string, unknown> = {};
      const row = existing[0];

      if (!row.email && encrypted.email) {
        // No primary email — store best extracted email as primary
        updates.email = encrypted.email;
        if (!row.normalizedEmail && encNormalizedEmail)
          updates.normalizedEmail = encNormalizedEmail;
        if (!row.normalizedEmailHash && hashes.normalizedEmailHash)
          updates.normalizedEmailHash = hashes.normalizedEmailHash;

        // Primary was empty and we just filled it — try to fill secondary with next email
        if (
          !row.secondaryEmail &&
          extractedEmails &&
          extractedEmails.length > 1
        ) {
          await this.fillSecondaryEmail(updates, extractedEmails[1]);
        }
      } else if (row.email && !row.secondaryEmail) {
        // Primary email exists, secondary is empty — find first different email
        const differentEmail = await this.findDifferentEmail(
          extractedEmails ?? [],
          row.normalizedEmailHash
        );
        if (differentEmail) {
          await this.fillSecondaryEmail(updates, differentEmail);
        }
      }

      if (!row.phone && encrypted.phone) updates.phone = encrypted.phone;
      if (!row.linkedin && encrypted.linkedin)
        updates.linkedin = encrypted.linkedin;
      if (!row.normalizedPhone && encNormalizedPhone)
        updates.normalizedPhone = encNormalizedPhone;
      if (!row.normalizedPhoneHash && hashes.normalizedPhoneHash)
        updates.normalizedPhoneHash = hashes.normalizedPhoneHash;
      if (!row.linkedinHash && hashes.linkedinHash)
        updates.linkedinHash = hashes.linkedinHash;

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = toUTC();
        await tx
          .update(schema.contactSensitiveData)
          .set(updates)
          .where(eq(schema.contactSensitiveData.id, row.id));
      }
    } else {
      // New record — fill primary and optionally secondary from extracted emails
      let secondaryEncrypted: {
        secondaryEmail?: string | null;
        normalizedSecondaryEmail?: string | null;
        normalizedSecondaryEmailHash?: string | null;
      } = {};

      if (extractedEmails && extractedEmails.length > 1) {
        const secEmail = extractedEmails[1];
        const encSec = await encryptContactFields({
          secondary_email: secEmail,
        });
        const encNormSec = await encryptNormalizedSecondaryEmail(secEmail);
        const secHashes = generateContactHashes({ secondaryEmail: secEmail });

        secondaryEncrypted = {
          secondaryEmail: encSec.secondaryEmail,
          normalizedSecondaryEmail: encNormSec,
          normalizedSecondaryEmailHash: secHashes.normalizedSecondaryEmailHash,
        };
      }

      await tx.insert(schema.contactSensitiveData).values({
        contactId,
        email: encrypted.email,
        phone: encrypted.phone,
        linkedin: encrypted.linkedin,
        normalizedEmail: encNormalizedEmail,
        normalizedPhone: encNormalizedPhone,
        normalizedEmailHash: hashes.normalizedEmailHash,
        normalizedPhoneHash: hashes.normalizedPhoneHash,
        linkedinHash: hashes.linkedinHash,
        ...(secondaryEncrypted.secondaryEmail
          ? {
              secondaryEmail: secondaryEncrypted.secondaryEmail,
              normalizedSecondaryEmail:
                secondaryEncrypted.normalizedSecondaryEmail,
              normalizedSecondaryEmailHash:
                secondaryEncrypted.normalizedSecondaryEmailHash,
            }
          : {}),
        encryptionKeyId: "default_key_v1",
        createdAt: toUTC(),
        updatedAt: toUTC(),
      });
    }
  }

  /**
   * Find the first email in extractedEmails that is different from the existing primary email hash.
   */
  private async findDifferentEmail(
    extractedEmails: string[],
    existingPrimaryHash: string | null
  ): Promise<string | null> {
    if (!existingPrimaryHash) return extractedEmails[0] ?? null;

    for (const email of extractedEmails) {
      const emailHash = hashData(normalizeEmail(email));
      if (emailHash && emailHash !== existingPrimaryHash) {
        return email;
      }
    }
    return null;
  }

  /**
   * Populate secondary email fields in the updates object.
   */
  private async fillSecondaryEmail(
    updates: Record<string, unknown>,
    email: string
  ): Promise<void> {
    const encSecondary = await encryptContactFields({
      secondary_email: email,
    });
    const encNormSecondary = await encryptNormalizedSecondaryEmail(email);
    const secondaryHashes = generateContactHashes({
      secondaryEmail: email,
    });

    if (encSecondary.secondaryEmail)
      updates.secondaryEmail = encSecondary.secondaryEmail;
    if (encNormSecondary) updates.normalizedSecondaryEmail = encNormSecondary;
    if (secondaryHashes.normalizedSecondaryEmailHash)
      updates.normalizedSecondaryEmailHash =
        secondaryHashes.normalizedSecondaryEmailHash;
  }

  /**
   * Upsert contact_enrichments record.
   * One entry per contact (unique constraint on contactId).
   */
  async upsertEnrichmentRecord(
    tx: DbTransaction,
    contactId: number,
    apolloResponse: ApolloMatchPerson,
    userId: string
  ): Promise<void> {
    const strippedResponse = stripPersonPiiFromResponse(apolloResponse);
    const now = toUTC();

    const existing = await tx
      .select({ id: schema.contactEnrichments.id })
      .from(schema.contactEnrichments)
      .where(eq(schema.contactEnrichments.contactId, contactId))
      .limit(1);

    if (existing[0]) {
      await tx
        .update(schema.contactEnrichments)
        .set({
          enrichmentStatus:
            CONTACT_ENRICHMENT_CONSTANTS.ENRICHMENT_STATUS_COMPLETED,
          enrichmentSource: CONTACT_ENRICHMENT_CONSTANTS.ENRICHMENT_SOURCE,
          enrichmentResponse: strippedResponse,
          externalPersonId: apolloResponse.id ?? null,
          enrichedBy: userId,
          enrichedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.contactEnrichments.id, existing[0].id));
    } else {
      await tx.insert(schema.contactEnrichments).values({
        contactId,
        enrichmentStatus:
          CONTACT_ENRICHMENT_CONSTANTS.ENRICHMENT_STATUS_COMPLETED,
        enrichmentSource: CONTACT_ENRICHMENT_CONSTANTS.ENRICHMENT_SOURCE,
        enrichmentRequestId: crypto.randomUUID(),
        enrichmentResponse: strippedResponse,
        externalPersonId: apolloResponse.id ?? null,
        enrichedBy: userId,
        enrichedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  /**
   * Find a contact by external person ID (e.g. Apollo person ID).
   * Uses the indexed external_person_id column for fast lookup.
   */
  async findContactByExternalPersonId(
    externalPersonId: string
  ): Promise<number | null> {
    const result = await this.db
      .select({ contactId: schema.contactEnrichments.contactId })
      .from(schema.contactEnrichments)
      .where(
        and(
          eq(schema.contactEnrichments.externalPersonId, externalPersonId),
          eq(
            schema.contactEnrichments.enrichmentStatus,
            CONTACT_ENRICHMENT_CONSTANTS.ENRICHMENT_STATUS_COMPLETED
          )
        )
      )
      .limit(1);

    return result[0]?.contactId ?? null;
  }
}
