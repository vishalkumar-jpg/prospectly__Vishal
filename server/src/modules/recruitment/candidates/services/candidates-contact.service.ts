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
  type IncomingContact,
} from "services/contactMatchingService";
import {
  encryptNormalizedEmail,
  encryptNormalizedPhone,
} from "services/contactImportService";

type DbTransaction = Parameters<
  Parameters<PostgresJsDatabase<typeof schema>["transaction"]>[0]
>[0];

@Injectable()
export class CandidatesContactService {
  private readonly logger = new Logger(CandidatesContactService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * @param resolvedLinkedinUrl LinkedIn submitted with this application, already
   *   canonicalised. Must be passed explicitly: the caller writes it to
   *   `users.linkedin_url` but does not refresh its in-memory `candidateUser`,
   *   so reading the profile here would miss a first-time LinkedIn and skip
   *   LinkedIn de-duplication entirely (the CSV import path passes it straight
   *   from the row, which is why import de-duplicates and apply did not).
   */
  async createContactForSharer(
    candidateUser: schema.User,
    sharerId: string,
    tx: DbTransaction,
    resolvedLinkedinUrl?: string | null
  ): Promise<number | null> {
    const linkedin =
      resolvedLinkedinUrl || candidateUser.linkedinUrl || undefined;

    const incoming: IncomingContact = {
      firstName: candidateUser.firstName || undefined,
      lastName: candidateUser.lastName || undefined,
      email: candidateUser.email || undefined,
      phone: candidateUser.phone || undefined,
      company: candidateUser.company || undefined,
      title: candidateUser.jobTitle || undefined,
      linkedin,
      city: candidateUser.location || undefined,
      industry: candidateUser.industry || undefined,
    };

    const matchResult = await findMatchingContact(incoming);

    if (matchResult.isMatch && matchResult.existingContactId) {
      // Contact already exists — ensure relationship for the sharer
      const relationshipId = await this.ensureRelationship(
        matchResult.existingContactId,
        sharerId,
        candidateUser,
        tx
      );
      await this.ensureImportSnapshot(relationshipId, "recruitment", tx);
      return matchResult.existingContactId;
    }

    // Create new contact
    const maskedEmail = candidateUser.email
      ? maskEmail(candidateUser.email)
      : null;
    const maskedPhone = candidateUser.phone
      ? maskPhone(candidateUser.phone)
      : null;

    const now = toUTC();

    const [newContact] = await tx
      .insert(schema.contacts)
      .values({
        originalImporterId: sharerId,
        firstName: candidateUser.firstName || null,
        lastName: candidateUser.lastName || null,
        email: maskedEmail,
        phoneNumber: maskedPhone,
        company: candidateUser.company || null,
        title: candidateUser.jobTitle || null,
        linkedin: linkedin || null,
        industry: candidateUser.industry || null,
        location: candidateUser.location || null,
        profilePhotoUrl: candidateUser.profilePhotoUrl || null,
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
        email: candidateUser.email || undefined,
        phone_number: candidateUser.phone || undefined,
        linkedin,
      }),
      encryptNormalizedEmail(candidateUser.email),
      encryptNormalizedPhone(candidateUser.phone),
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

    // Create relationship for sharer
    const relationshipId = await this.ensureRelationship(
      newContact.id,
      sharerId,
      candidateUser,
      tx
    );
    await this.ensureImportSnapshot(relationshipId, "recruitment", tx);

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
    candidateUser: schema.User,
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
          firstName: candidateUser.firstName || null,
          lastName: candidateUser.lastName || null,
          company: candidateUser.company || null,
          title: candidateUser.jobTitle || null,
          bountyAmount: "0",
          bountyStatus: "pending",
        })
        .returning({ id: schema.contactRelationships.id });
      return inserted.id;
    } catch (error: unknown) {
      // Handle unique constraint race condition
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

  private async ensureImportSnapshot(
    relationshipId: number,
    sourceType: string,
    tx: DbTransaction
  ): Promise<void> {
    try {
      const [existing] = await tx
        .select({ id: schema.contactImportSnapshots.id })
        .from(schema.contactImportSnapshots)
        .where(
          and(
            eq(schema.contactImportSnapshots.relationshipId, relationshipId),
            eq(schema.contactImportSnapshots.sourceType, sourceType)
          )
        )
        .limit(1);

      if (existing) return;

      await tx.insert(schema.contactImportSnapshots).values({
        relationshipId,
        sourceType,
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        return;
      }
      this.logger.error(
        `CANDIDATES_CONTACT_SERVICE :: ensureImportSnapshot : ERROR : ${error}`
      );
      throw error;
    }
  }
}
