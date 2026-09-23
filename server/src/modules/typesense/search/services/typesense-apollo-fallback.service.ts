import { Injectable, Inject, Logger, Optional } from "@nestjs/common";
import { Client } from "typesense";
import { ApolloSearchService } from "modules/apollo/apollo-search.service";
import {
  APOLLO_MAX_PAGES,
  MAX_APOLLO_DEDUP_RETRIES,
} from "../typesense-search.constants";
import {
  TYPESENSE_TOKEN,
  TYPESENSE_COLLECTION_NAME,
  APOLLO_CACHE_COLLECTION_NAME,
} from "../../core/typesense.constants";
import {
  TypesenseSearchParams,
  TypesenseSearchResponse,
} from "../../core/typesense.types";
import { TypesenseSyncQueueService } from "../../sync-queue/typesense-sync-queue.service";

@Injectable()
export class TypesenseApolloFallbackService {
  private readonly logger = new Logger(TypesenseApolloFallbackService.name);

  constructor(
    @Inject(TYPESENSE_TOKEN)
    private readonly client: Client,
    @Optional()
    private readonly apolloSearchService?: ApolloSearchService,
    @Optional()
    private readonly typesenseSyncQueueService?: TypesenseSyncQueueService
  ) {}

  get isAvailable(): boolean {
    return !!this.apolloSearchService;
  }

  async search(
    params: TypesenseSearchParams,
    query: string,
    apolloPage = 1,
    limit = 50
  ): Promise<TypesenseSearchResponse> {
    if (!this.apolloSearchService) {
      return { contacts: [], count: 0, query, hasNextPage: false };
    }

    if (apolloPage > APOLLO_MAX_PAGES) {
      return { contacts: [], count: 0, query, hasNextPage: false };
    }

    try {
      let currentApolloPage = apolloPage;

      // Retry loop: when dedup filters ALL results on a page, try next page(s)
      // instead of returning empty with hasNextPage: true (which causes infinite client fetches)
      for (let attempt = 0; attempt <= MAX_APOLLO_DEDUP_RETRIES; attempt++) {
        if (currentApolloPage > APOLLO_MAX_PAGES) {
          return { contacts: [], count: 0, query, hasNextPage: false };
        }

        this.logger.log(
          `Falling back to Apollo API for "${query}" (page ${currentApolloPage})`
        );

        const allApolloResults = await this.apolloSearchService.searchPeople(
          params,
          currentApolloPage,
          limit
        );
        const apolloResults = allApolloResults.filter(
          (r) => r.has_email === true
        );

        if (apolloResults.length === 0) {
          return { contacts: [], count: 0, query, hasNextPage: false };
        }

        const apolloIds = apolloResults.map((r) => r.id);
        const [existingCacheIds, existingContactExternalIds] =
          await Promise.all([
            this.filterExistingCacheIds(apolloIds),
            this.filterExistingContactExternalIds(apolloIds),
          ]);
        const allExistingIds = new Set([
          ...existingCacheIds,
          ...existingContactExternalIds,
        ]);
        const newResults = apolloResults.filter(
          (r) => !allExistingIds.has(r.id)
        );

        // Enqueue only new results for background sync
        if (this.typesenseSyncQueueService && newResults.length > 0) {
          try {
            await this.typesenseSyncQueueService.enqueueApolloCacheSync(
              newResults
            );
          } catch (syncError) {
            this.logger.error(
              `TYPESENSE_APOLLO_FALLBACK_SERVICE :: ENQUEUE_APOLLO_CACHE_SYNC : ERROR : ${syncError}`
            );
          }
        }

        const apolloHasMore =
          allApolloResults.length >= limit &&
          currentApolloPage < APOLLO_MAX_PAGES;

        if (newResults.length > 0) {
          return {
            contacts: newResults,
            count: newResults.length,
            query,
            hasNextPage: apolloHasMore,
          };
        }

        // All results on this page were duplicates — try next Apollo page
        if (!apolloHasMore) {
          return { contacts: [], count: 0, query, hasNextPage: false };
        }

        currentApolloPage++;
      }

      // Exhausted retries — all pages were duplicates, stop pagination
      return { contacts: [], count: 0, query, hasNextPage: false };
    } catch (error) {
      this.logger.error(
        `TYPESENSE_APOLLO_FALLBACK_SERVICE :: SEARCH : ERROR : ${error}`
      );
      return { contacts: [], count: 0, query, hasNextPage: false };
    }
  }

  private async filterExistingCacheIds(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    try {
      const idFilter = ids.map((id) => `\`${id}\``).join(",");
      const result = await this.client
        .collections(APOLLO_CACHE_COLLECTION_NAME)
        .documents()
        .search({
          q: "*",
          filter_by: `id:[${idFilter}]`,
          per_page: ids.length,
          include_fields: "id",
        });

      return new Set(
        (result.hits || []).map((hit) => (hit.document as { id: string }).id)
      );
    } catch {
      return new Set();
    }
  }

  private async filterExistingContactExternalIds(
    apolloIds: string[]
  ): Promise<Set<string>> {
    if (apolloIds.length === 0) return new Set();
    try {
      const idFilter = apolloIds.map((id) => `\`${id}\``).join(",");
      const result = await this.client
        .collections(TYPESENSE_COLLECTION_NAME)
        .documents()
        .search({
          q: "*",
          filter_by: `external_person_id:[${idFilter}]`,
          per_page: apolloIds.length,
          include_fields: "external_person_id",
        });

      return new Set(
        (result.hits || []).map(
          (hit) =>
            (hit.document as { external_person_id: string }).external_person_id
        )
      );
    } catch {
      return new Set();
    }
  }
}
