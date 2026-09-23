import { Injectable, Inject, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import {
  encryptContactFields,
  maskEmail,
  maskPhone,
} from "services/encryptionService";
import {
  findMatchingContact,
  generateContactHashes,
  hashData,
  normalizeLinkedIn,
  type IncomingContact,
} from "services/contactMatchingService";
import {
  encryptNormalizedEmail,
  encryptNormalizedPhone,
} from "services/contactImportService";
import { toCanonicalLinkedInProfileUrl } from "utils/linkedin-profile.utils";
import type { ResumeContactInfo } from "../../resume-extraction/services/resume-extraction-ai.service";

type DbTransaction = Parameters<
  Parameters<PostgresJsDatabase<typeof schema>["transaction"]>[0]
>[0];

@Injectable()
export class ConnectorUploadContactService {
  private readonly logger = new Logger(ConnectorUploadContactService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async createOrFindContact(
    contactInfo: ResumeContactInfo,
    jobTitle: string | null,
    connectorUserId: string
  ): Promise<number> {
    // Resume-extracted phone and LinkedIn must not participate in matching —
    // wrong/shared URLs would silent-merge unrelated people. Email is the only
    // trusted dedup key on this path. LinkedIn is persisted AFTER match via
    // persistExtractedLinkedin (suggestion for candidate confirm).
    const safeContactInfo: ResumeContactInfo = {
      ...contactInfo,
      phone: null,
      linkedinUrl: null,
    };

    return this.db.transaction(async (tx) => {
      const incoming: IncomingContact = {
        firstName: safeContactInfo.firstName || undefined,
        lastName: safeContactInfo.lastName || undefined,
        email: safeContactInfo.email || undefined,
        phone: undefined,
        linkedin: undefined,
        title: jobTitle || undefined,
      };

      const matchResult = await findMatchingContact(incoming);

      if (matchResult.isMatch && matchResult.existingContactId) {
        await this.ensureRelationship(
          matchResult.existingContactId,
          connectorUserId,
          safeContactInfo,
          jobTitle,
          tx
        );
        await this.ensureEnrichment(matchResult.existingContactId, tx);
        return matchResult.existingContactId;
      }

      return this.createNewContact(
        safeContactInfo,
        jobTitle,
        connectorUserId,
        incoming,
        tx
      );
    });
  }

  /**
   * Store AI-extracted LinkedIn after email-only dedup.
   * Never overwrites an existing contact LinkedIn.
   */
  async persistExtractedLinkedin(
    contactId: number,
    linkedinUrl: string | null | undefined
  ): Promise<void> {
    const displayUrl = toCanonicalLinkedInProfileUrl(linkedinUrl);
    if (!displayUrl) {
      this.logger.log(
        `CONNECTOR_UPLOAD_CONTACT :: persistExtractedLinkedin : SKIP_INVALID : contactId=${contactId}`
      );
      return;
    }
    const normalized = normalizeLinkedIn(displayUrl);
    if (!normalized) return;

    const [existing] = await this.db
      .select({ linkedin: schema.contacts.linkedin })
      .from(schema.contacts)
      .where(eq(schema.contacts.id, contactId))
      .limit(1);

    const existingCanonical = toCanonicalLinkedInProfileUrl(existing?.linkedin);
    if (existingCanonical) {
      this.logger.log(
        `CONNECTOR_UPLOAD_CONTACT :: persistExtractedLinkedin : SKIP_EXISTING : contactId=${contactId}`
      );
      return;
    }
    // Existing value may be a placeholder (e.g. linkedin.com/in/username) —
    // overwrite with this canonical extract.

    const now = toUTC();
    const encryptedFields = await encryptContactFields({
      linkedin: displayUrl,
    });
    const linkedinHash = hashData(normalized);

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.contacts)
        .set({ linkedin: displayUrl, updatedAt: now })
        .where(eq(schema.contacts.id, contactId));

      await tx
        .update(schema.contactSensitiveData)
        .set({
          linkedin: encryptedFields.linkedin,
          linkedinHash,
        })
        .where(eq(schema.contactSensitiveData.contactId, contactId));
    });

    this.logger.log(
      `CONNECTOR_UPLOAD_CONTACT :: persistExtractedLinkedin : SAVED : contactId=${contactId}`
    );
  }

  private async createNewContact(
    contactInfo: ResumeContactInfo,
    jobTitle: string | null,
    connectorUserId: string,
    incoming: IncomingContact,
    tx: DbTransaction
  ): Promise<number> {
    const maskedEmail = contactInfo.email ? maskEmail(contactInfo.email) : null;
    const maskedPhone = contactInfo.phone ? maskPhone(contactInfo.phone) : null;
    const now = toUTC();

    const [newContact] = await tx
      .insert(schema.contacts)
      .values({
        originalImporterId: connectorUserId,
        firstName: contactInfo.firstName || null,
        lastName: contactInfo.lastName || null,
        email: maskedEmail,
        phoneNumber: maskedPhone,
        company: null,
        title: jobTitle || null,
        linkedin: contactInfo.linkedinUrl || null,
        source: "recruitment",
        bountyAmount: "0",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: schema.contacts.id });

    // Encrypt sensitive data
    const [
      encryptedFields,
      encryptedNormalizedEmailValue,
      encryptedNormalizedPhoneValue,
    ] = await Promise.all([
      encryptContactFields({
        email: contactInfo.email || undefined,
        phone_number: contactInfo.phone || undefined,
        linkedin: contactInfo.linkedinUrl || undefined,
      }),
      encryptNormalizedEmail(contactInfo.email),
      encryptNormalizedPhone(contactInfo.phone),
    ]);

    const hashes = generateContactHashes(incoming);

    await tx.insert(schema.contactSensitiveData).values({
      contactId: newContact.id,
      email: encryptedFields.email,
      phone: encryptedFields.phone,
      linkedin: encryptedFields.linkedin,
      normalizedEmail: encryptedNormalizedEmailValue,
      normalizedPhone: encryptedNormalizedPhoneValue,
      normalizedEmailHash: hashes.normalizedEmailHash,
      normalizedPhoneHash: hashes.normalizedPhoneHash,
      linkedinHash: hashes.linkedinHash,
    });

    // Create relationship
    await this.ensureRelationship(
      newContact.id,
      connectorUserId,
      contactInfo,
      jobTitle,
      tx
    );

    // Queue for enrichment
    await tx.insert(schema.contactEnrichments).values({
      contactId: newContact.id,
      enrichmentStatus: "pending",
      enrichmentSource: "apollo",
    });

    return newContact.id;
  }

  private async ensureRelationship(
    contactId: number,
    userId: string,
    contactInfo: ResumeContactInfo,
    jobTitle: string | null,
    tx: DbTransaction
  ): Promise<number> {
    const [existing] = await tx
      .select({ id: schema.contactRelationships.id })
      .from(schema.contactRelationships)
      .where(
        and(
          eq(schema.contactRelationships.contactId, contactId),
          eq(schema.contactRelationships.userId, userId)
        )
      )
      .limit(1);

    if (existing) return existing.id;

    try {
      const [inserted] = await tx
        .insert(schema.contactRelationships)
        .values({
          contactId,
          userId,
          firstName: contactInfo.firstName || null,
          lastName: contactInfo.lastName || null,
          company: null,
          title: jobTitle || null,
          bountyAmount: "0",
          bountyStatus: "pending",
        })
        .returning({ id: schema.contactRelationships.id });

      // Create import snapshot
      await tx.insert(schema.contactImportSnapshots).values({
        relationshipId: inserted.id,
        sourceType: "recruitment",
      });

      return inserted.id;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        const [raced] = await tx
          .select({ id: schema.contactRelationships.id })
          .from(schema.contactRelationships)
          .where(
            and(
              eq(schema.contactRelationships.contactId, contactId),
              eq(schema.contactRelationships.userId, userId)
            )
          )
          .limit(1);
        return raced.id;
      }
      throw error;
    }
  }

  private async ensureEnrichment(
    contactId: number,
    tx: DbTransaction
  ): Promise<void> {
    const [existing] = await tx
      .select({ id: schema.contactEnrichments.id })
      .from(schema.contactEnrichments)
      .where(eq(schema.contactEnrichments.contactId, contactId))
      .limit(1);

    if (existing) return;

    try {
      await tx.insert(schema.contactEnrichments).values({
        contactId,
        enrichmentStatus: "pending",
        enrichmentSource: "apollo",
      });
    } catch (error: unknown) {
      // Ignore unique constraint violation (race condition)
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        return;
      }
      throw error;
    }
  }
}
