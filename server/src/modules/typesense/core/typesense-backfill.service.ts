import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq, isNull, count, and, inArray, asc } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { TypesenseService } from "./typesense.service";
import { TypesenseContactDocument } from "./typesense.types";
import {
  TYPESENSE_CHUNK_SIZE,
  TYPESENSE_BATCH_DELAY_MS,
} from "./typesense.constants";

@Injectable()
export class TypesenseBackfillService {
  private readonly logger = new Logger(TypesenseBackfillService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly typesenseService: TypesenseService
  ) {}

  async backfillAllContacts(force = false): Promise<{
    totalContacts: number;
    synced: number;
    failed: number;
    failedDocumentIds: string[];
  }> {
    // Step 1: Count total contacts
    const whereCondition = force
      ? isNull(schema.contacts.deletedAt)
      : and(
          isNull(schema.contacts.deletedAt),
          eq(schema.contacts.isTypesenseSynced, false)
        );

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(schema.contacts)
      .where(whereCondition);

    const totalContacts = Number(total);
    const totalBatches = Math.ceil(totalContacts / TYPESENSE_CHUNK_SIZE);

    this.logger.log(
      `TYPESENSE_BACKFILL :: BACKFILL_ALL_CONTACTS : Starting backfill of ${totalContacts} contacts in ${totalBatches} batches (force: ${force})`
    );

    if (totalContacts === 0) {
      this.logger.log(
        `TYPESENSE_BACKFILL :: BACKFILL_ALL_CONTACTS : No contacts to backfill`
      );
      return { totalContacts: 0, synced: 0, failed: 0, failedDocumentIds: [] };
    }

    // Step 2: Process in paginated batches
    let totalSynced = 0;
    const allFailedIds: string[] = [];

    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      // When not forcing, always offset 0 since previous batch was marked synced
      const offset = force ? batchNum * TYPESENSE_CHUNK_SIZE : 0;

      const contacts = await this.db
        .select({
          id: schema.contacts.id,
          firstName: schema.contacts.firstName,
          lastName: schema.contacts.lastName,
          title: schema.contacts.title,
          linkedin: schema.contacts.linkedin,
          linkedinConnections: schema.contacts.linkedinConnections,
          location: schema.contacts.location,
          city: schema.contacts.city,
          state: schema.contacts.state,
          country: schema.contacts.country,
          industry: schema.contacts.industry,
          company: schema.contacts.company,
          companyDescription: schema.contacts.companyDescription,
          companyType: schema.contacts.companyType,
          companyIndustry: schema.contacts.companyIndustry,
          companyDomain: schema.contacts.companyDomain,
          companyLinkedinUrl: schema.contacts.companyLinkedinUrl,
          employees: schema.contacts.employees,
          website: schema.contacts.website,
          email: schema.contacts.email,
          profilePhotoUrl: schema.contacts.profilePhotoUrl,
          bountyAmount: schema.contacts.bountyAmount,
          enrichmentStatus: schema.contactEnrichments.enrichmentStatus,
          enrichmentSource: schema.contactEnrichments.enrichmentSource,
          externalPersonId: schema.contactEnrichments.externalPersonId,
        })
        .from(schema.contacts)
        .leftJoin(
          schema.contactEnrichments,
          eq(schema.contacts.id, schema.contactEnrichments.contactId)
        )
        .where(whereCondition)
        .orderBy(asc(schema.contacts.id))
        .limit(TYPESENSE_CHUNK_SIZE)
        .offset(offset);

      if (contacts.length === 0) break;

      const documents = contacts.map((contact) =>
        this.transformToDocument(contact)
      );

      // Bulk upsert batch
      try {
        const upsertResult = await this.typesenseService.bulkUpsert(documents);

        // Retry failed documents
        let batchFailedIds = upsertResult.failedDocumentIds;
        if (batchFailedIds.length > 0) {
          const retryResult = await this.typesenseService.retryFailedDocuments(
            documents,
            batchFailedIds
          );
          batchFailedIds = retryResult.finalFailedIds;
        }

        // Mark successfully synced contacts
        const succeededIds = documents
          .map((d) => Number(d.id))
          .filter((id) => !batchFailedIds.includes(String(id)));

        if (succeededIds.length > 0) {
          await this.db
            .update(schema.contacts)
            .set({ isTypesenseSynced: true })
            .where(inArray(schema.contacts.id, succeededIds));
        }

        const batchSynced = documents.length - batchFailedIds.length;
        totalSynced += batchSynced;
        allFailedIds.push(...batchFailedIds);

        this.logger.log(
          `TYPESENSE_BACKFILL :: BACKFILL_ALL_CONTACTS : Batch ${batchNum + 1}/${totalBatches} complete: ${batchSynced} synced, ${batchFailedIds.length} failed`
        );
      } catch (error) {
        const batchDocIds = documents.map((d) => d.id);
        allFailedIds.push(...batchDocIds);
        this.logger.error(
          `TYPESENSE_BACKFILL :: BACKFILL_ALL_CONTACTS : Batch ${batchNum + 1}/${totalBatches} ERROR : ${error}`
        );
      }

      // Throttle between batches to avoid overwhelming Typesense/DB on large backfills
      if (batchNum < totalBatches - 1) {
        await this.delay(TYPESENSE_BATCH_DELAY_MS);
      }
    }

    this.logger.log(
      `TYPESENSE_BACKFILL :: BACKFILL_ALL_CONTACTS : Backfill complete: ${totalSynced} synced, ${allFailedIds.length} failed out of ${totalContacts} total`
    );

    if (allFailedIds.length > 0) {
      this.logger.warn(
        `TYPESENSE_BACKFILL :: BACKFILL_ALL_CONTACTS : Permanently failed document IDs: ${allFailedIds.join(", ")}`
      );
    }

    return {
      totalContacts,
      synced: totalSynced,
      failed: allFailedIds.length,
      failedDocumentIds: allFailedIds,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformToDocument(contact: any): TypesenseContactDocument {
    return {
      id: String(contact.id),
      contact_id: String(contact.id),
      first_name: contact.firstName || "",
      last_name: contact.lastName || "",
      title: contact.title || "",
      linkedin: contact.linkedin || "",
      linkedin_connections: contact.linkedinConnections || "",
      location: contact.location || "",
      city: contact.city || "",
      state: contact.state || "",
      country: contact.country || "",
      industry: contact.industry || "",
      company: contact.company || "",
      company_description: contact.companyDescription || "",
      company_type: contact.companyType || "",
      company_industry: contact.companyIndustry || "",
      company_domain: contact.companyDomain || "",
      company_linkedin_url: contact.companyLinkedinUrl || "",
      employees: contact.employees || "",
      website: contact.website || "",
      has_email: !!(contact.email && contact.email.trim() !== ""),
      has_linkedin: !!(contact.linkedin && contact.linkedin.trim() !== ""),
      profile_photo_url: contact.profilePhotoUrl || "",
      bounty_amount: parseFloat(contact.bountyAmount) || 0,
      enrichment_status: contact.enrichmentStatus || "pending",
      enrichment_source: contact.enrichmentSource || "apollo",
      external_person_id: contact.externalPersonId || "",
    };
  }
}
