import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger, Inject } from "@nestjs/common";
import { Job } from "bullmq";
import { and, inArray, isNull } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { TypesenseService } from "modules/typesense/core/typesense.service";
import { TypesenseBackfillService } from "modules/typesense/core/typesense-backfill.service";
import { TypesenseContactDocument } from "modules/typesense/core/typesense.types";
import { TYPESENSE_CHUNK_SIZE } from "modules/typesense/core/typesense.constants";
import {
  TYPESENSE_SYNC_QUEUE_NAME,
  TYPESENSE_SYNC_QUEUE_JOBS,
} from "./constants/typesense-sync-queue.constants";
import {
  TypesenseSyncJobData,
  ContactSyncJobData,
  ApolloCacheSyncJobData,
  TypesenseSyncJobResult,
} from "./typesense-sync-queue.types";

@Processor(TYPESENSE_SYNC_QUEUE_NAME)
export class TypesenseSyncQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(TypesenseSyncQueueProcessor.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly typesenseService: TypesenseService,
    private readonly typesenseBackfillService: TypesenseBackfillService
  ) {
    super();
  }

  async process(
    job: Job<TypesenseSyncJobData>
  ): Promise<TypesenseSyncJobResult> {
    switch (job.name) {
      case TYPESENSE_SYNC_QUEUE_JOBS.APOLLO_CACHE_SYNC:
        return this.processApolloCacheSync(job as Job<ApolloCacheSyncJobData>);
      case TYPESENSE_SYNC_QUEUE_JOBS.CONTACT_SYNC:
        return this.processContactSync(job as Job<ContactSyncJobData>);
      default:
        throw new Error(
          `Unsupported job name: ${job.name} on queue ${TYPESENSE_SYNC_QUEUE_NAME}`
        );
    }
  }

  private async processApolloCacheSync(
    job: Job<ApolloCacheSyncJobData>
  ): Promise<TypesenseSyncJobResult> {
    const { documents } = job.data;

    this.logger.log(
      `Processing apollo cache sync job ${job.id}: ${documents.length} documents`
    );

    try {
      const upsertResult =
        await this.typesenseService.bulkUpsertApolloCache(documents);

      await job.updateProgress(100);

      const synced =
        upsertResult.totalDocuments - upsertResult.failedDocumentIds.length;

      this.logger.log(
        `Apollo cache sync completed: ${synced} synced, ${upsertResult.failedDocumentIds.length} failed`
      );

      return {
        success: true,
        totalDocuments: upsertResult.totalDocuments,
        synced,
        failed: upsertResult.failedDocumentIds.length,
        failedDocumentIds: upsertResult.failedDocumentIds,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Apollo cache sync job ${job.id} failed: ${errorMessage}`
      );
      throw error;
    }
  }

  private async processContactSync(
    job: Job<ContactSyncJobData>
  ): Promise<TypesenseSyncJobResult> {
    const { contactIds, userId, source } = job.data;

    this.logger.log(
      `Processing typesense sync job ${job.id}: ${contactIds.length} contacts (source: ${source}, user: ${userId})`
    );

    try {
      // Step 1: Fetch fresh data from DB in batches
      const allDocuments: TypesenseContactDocument[] = [];

      for (let i = 0; i < contactIds.length; i += TYPESENSE_CHUNK_SIZE) {
        const batchIds = contactIds.slice(i, i + TYPESENSE_CHUNK_SIZE);

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
          .where(
            and(
              inArray(
                schema.contacts.id,
                batchIds.map((id) => BigInt(id))
              ),
              isNull(schema.contacts.deletedAt)
            )
          );

        const documents = contacts.map((contact) =>
          this.typesenseBackfillService.transformToDocument(contact)
        );
        allDocuments.push(...documents);

        // Update progress (0-50%)
        const progress = Math.round(
          (Math.min(i + TYPESENSE_CHUNK_SIZE, contactIds.length) /
            contactIds.length) *
            50
        );
        await job.updateProgress(progress);
      }

      this.logger.log(
        `Fetched ${allDocuments.length} contacts from DB for typesense sync`
      );

      if (allDocuments.length === 0) {
        return {
          success: true,
          totalDocuments: 0,
          synced: 0,
          failed: 0,
          failedDocumentIds: [],
        };
      }

      // Step 2: Bulk upsert to Typesense
      await job.updateProgress(50);
      const upsertResult = await this.typesenseService.bulkUpsert(allDocuments);
      await job.updateProgress(90);

      // Step 3: Retry failed documents
      let finalFailedIds = upsertResult.failedDocumentIds;
      if (finalFailedIds.length > 0) {
        this.logger.log(
          `Retrying ${finalFailedIds.length} failed documents...`
        );
        const retryResult = await this.typesenseService.retryFailedDocuments(
          allDocuments,
          finalFailedIds
        );
        finalFailedIds = retryResult.finalFailedIds;
      }

      // Mark successfully synced contacts
      const succeededIds = allDocuments
        .map((d) => Number(d.id))
        .filter((id) => !finalFailedIds.includes(String(id)));

      if (succeededIds.length > 0) {
        await this.db
          .update(schema.contacts)
          .set({ isTypesenseSynced: true })
          .where(inArray(schema.contacts.id, succeededIds));
      }

      await job.updateProgress(100);

      const synced = allDocuments.length - finalFailedIds.length;

      this.logger.log(
        `Typesense sync completed: ${synced} synced, ${finalFailedIds.length} failed out of ${allDocuments.length} total`
      );

      if (finalFailedIds.length > 0) {
        this.logger.warn(
          `Permanently failed document IDs: ${finalFailedIds.join(", ")}`
        );
      }

      return {
        success: true,
        totalDocuments: allDocuments.length,
        synced,
        failed: finalFailedIds.length,
        failedDocumentIds: finalFailedIds,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Typesense sync job ${job.id} failed: ${errorMessage}`);
      throw error;
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<TypesenseSyncJobData>) {
    this.logger.log(`Typesense sync job ${job.id} completed successfully`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<TypesenseSyncJobData>, error: Error) {
    this.logger.error(`Typesense sync job ${job.id} failed: ${error.message}`);
  }
}
