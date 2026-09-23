import { Injectable, Logger, Inject } from "@nestjs/common";
import { ProfilesService } from "modules/profiles/profiles.service";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { inArray } from "drizzle-orm";
import { decryptData } from "services/encryptionService";
import { normalizeEmail } from "services/contactMatchingService";

@Injectable()
export class ContactOrganizationEnricherService {
  private readonly logger = new Logger(ContactOrganizationEnricherService.name);

  constructor(
    private profilesService: ProfilesService,
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Decrypts normalized email (or primary email) from contact sensitive data, matches registered
   * users via `users.email`, and batch-loads organizations. Prefer `contactIdToRegisteredUserId`
   * to map a contact to a platform user id. `contactIdToDecryptedEmail` stays empty strings so
   * plaintext is not returned on the API surface.
   */
  async getContactOrganizationsMap(contactIds: number[]) {
    const uniqueContactIds = [...new Set(contactIds)];
    const contactIdToNormalizedEmail = new Map<number, string>();
    const failedContactIds = new Set<number>();

    try {
      const sensitiveDataRecords = await this.db
        .select({
          contactId: schema.contactSensitiveData.contactId,
          normalizedEmail: schema.contactSensitiveData.normalizedEmail,
          email: schema.contactSensitiveData.email,
        })
        .from(schema.contactSensitiveData)
        .where(
          inArray(schema.contactSensitiveData.contactId, uniqueContactIds)
        );

      const foundContactIds = new Set(
        sensitiveDataRecords.map((r) => r.contactId)
      );
      for (const id of uniqueContactIds) {
        if (!foundContactIds.has(id)) {
          failedContactIds.add(id);
        }
      }

      for (const record of sensitiveDataRecords) {
        const normalized = await this.resolveNormalizedEmailFromSensitiveRow(
          record.normalizedEmail,
          record.email
        );
        if (normalized) {
          contactIdToNormalizedEmail.set(record.contactId, normalized);
        } else {
          failedContactIds.add(record.contactId);
        }
      }

      if (failedContactIds.size > 0) {
        const failedIdsArr = [...failedContactIds];
        this.logger.error(
          `CONTACT_ORGANIZATION_ENRICHER_SERVICE :: getContactOrganizationsMap : ERROR : ` +
            `Failed to resolve email for ${failedContactIds.size} contact(s). IDs: [${failedIdsArr.join(", ")}]. ` +
            `Reason: Missing sensitive row, missing ciphertext, decrypt failure, or invalid email`
        );
      }
    } catch (error) {
      const errMsg =
        error instanceof Error
          ? error.message
          : String(error ?? "Unknown error");
      this.logger.error(
        `CONTACT_ORGANIZATION_ENRICHER_SERVICE :: getContactOrganizationsMap : ERROR : ` +
          `Database failed for ${uniqueContactIds.length} contact(s). ${errMsg}`
      );
      uniqueContactIds.forEach((id) => failedContactIds.add(id));
    }

    const uniqueNormalized = [...new Set(contactIdToNormalizedEmail.values())];
    let normalizedEmailToUserId = new Map<string, string>();
    try {
      normalizedEmailToUserId =
        await this.profilesService.getUserIdsByNormalizedEmails(
          uniqueNormalized
        );
    } catch (error) {
      const errMsg =
        error instanceof Error
          ? error.message
          : String(error ?? "Unknown error");
      this.logger.error(
        `CONTACT_ORGANIZATION_ENRICHER_SERVICE :: getContactOrganizationsMap : ERROR : ` +
          `getUserIdsByNormalizedEmails failed (${uniqueNormalized.length} email(s)). ${errMsg}`
      );
    }

    const prospectOrgUserIds = [...new Set(normalizedEmailToUserId.values())];
    let prospectOrgsByUserId: Map<
      string,
      Array<{ id: string; name: string; isVerified: boolean }>
    > = new Map();
    try {
      prospectOrgsByUserId =
        await this.profilesService.getOrganizationsForUserIds(
          prospectOrgUserIds
        );
    } catch (error) {
      const errMsg =
        error instanceof Error
          ? error.message
          : String(error ?? "Unknown error");
      this.logger.error(
        `CONTACT_ORGANIZATION_ENRICHER_SERVICE :: getContactOrganizationsMap : ERROR : ` +
          `getOrganizationsForUserIds failed (${prospectOrgUserIds.length} user id(s)). ${errMsg}`
      );
    }

    const contactIdToDecryptedEmail = new Map<number, string>();
    const contactIdToRegisteredUserId = new Map<number, string>();
    contactIdToNormalizedEmail.forEach((normalized, contactId) => {
      contactIdToDecryptedEmail.set(contactId, "");
      const userId = normalizedEmailToUserId.get(normalized);
      if (userId) {
        contactIdToRegisteredUserId.set(contactId, userId);
      }
    });

    return {
      contactIdToDecryptedEmail,
      contactIdToRegisteredUserId,
      emailToUserId: normalizedEmailToUserId,
      orgsByUserId: prospectOrgsByUserId,
    };
  }

  private async resolveNormalizedEmailFromSensitiveRow(
    encryptedNormalizedEmail: string | null,
    encryptedEmail: string | null
  ): Promise<string | null> {
    if (encryptedNormalizedEmail) {
      try {
        const plain = await decryptData(encryptedNormalizedEmail);
        const n = normalizeEmail(plain);
        if (n) {
          return n;
        }
      } catch (error) {
        this.logger.warn(
          `CONTACT_ORGANIZATION_ENRICHER_SERVICE :: resolveNormalizedEmailFromSensitiveRow : ` +
            `decrypt normalized_email failed : ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    if (encryptedEmail) {
      try {
        const plain = await decryptData(encryptedEmail);
        return normalizeEmail(plain);
      } catch (error) {
        this.logger.warn(
          `CONTACT_ORGANIZATION_ENRICHER_SERVICE :: resolveNormalizedEmailFromSensitiveRow : ` +
            `decrypt email failed : ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    return null;
  }
}
