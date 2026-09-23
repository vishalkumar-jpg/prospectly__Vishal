import { Injectable, Inject, Logger, Optional } from "@nestjs/common";
import { Client } from "typesense";
import { TypesenseSyncQueueService } from "modules/typesense/sync-queue/typesense-sync-queue.service";
import {
  TYPESENSE_TOKEN,
  APOLLO_CACHE_COLLECTION_NAME,
} from "modules/typesense/core/typesense.constants";

@Injectable()
export class ContactEnrichmentTypesenseService {
  private readonly logger = new Logger(ContactEnrichmentTypesenseService.name);

  constructor(
    @Inject(TYPESENSE_TOKEN) private readonly client: Client,
    @Optional()
    private readonly typesenseSyncQueueService?: TypesenseSyncQueueService
  ) {}

  /**
   * Queue a Typesense sync for the enriched contact.
   * Never throws — sync failure should not fail the enrichment API response.
   */
  async syncEnrichedContact(contactId: number): Promise<void> {
    try {
      if (!this.typesenseSyncQueueService) {
        this.logger.warn(
          "CONTACT_ENRICHMENT_TYPESENSE :: SYNC : TypesenseSyncQueueService not available"
        );
        return;
      }

      await this.typesenseSyncQueueService.enqueueSyncJob(
        [String(contactId)],
        "system",
        "apollo_enrichment"
      );
    } catch (error) {
      this.logger.error(
        `CONTACT_ENRICHMENT_TYPESENSE :: SYNC_ENRICHED_CONTACT : ERROR : ${error}`
      );
    }
  }

  /**
   * Delete a document from the apollo_people_cache collection.
   * Called after apollo-source enrichment to prevent duplicate search results.
   * Never throws — cache cleanup failure should not affect enrichment.
   */
  async deleteFromApolloCache(apolloId: string): Promise<void> {
    try {
      await this.client
        .collections(APOLLO_CACHE_COLLECTION_NAME)
        .documents(apolloId)
        .delete();
    } catch (error) {
      this.logger.error(
        `CONTACT_ENRICHMENT_TYPESENSE :: DELETE_FROM_APOLLO_CACHE : ERROR : ${error}`
      );
    }
  }
}
