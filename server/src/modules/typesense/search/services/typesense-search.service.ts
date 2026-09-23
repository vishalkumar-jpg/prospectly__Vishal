import { Injectable, Logger } from "@nestjs/common";
import { TypesenseMultiSearchService } from "./typesense-multi-search.service";
import { TypesenseApolloFallbackService } from "./typesense-apollo-fallback.service";
import {
  TypesenseSearchParams,
  TypesenseSearchResponse,
} from "../../core/typesense.types";
import {
  mergeByRelevanceScore,
  postFilterResults,
} from "../typesense-search.utils";

@Injectable()
export class TypesenseSearchService {
  private readonly logger = new Logger(TypesenseSearchService.name);

  constructor(
    private readonly multiSearchService: TypesenseMultiSearchService,
    private readonly apolloFallbackService: TypesenseApolloFallbackService
  ) {}

  async searchContacts(
    params: TypesenseSearchParams
  ): Promise<TypesenseSearchResponse> {
    const limit = Math.min(params.limit || 50, 100);
    const page = Math.max(params.page || 1, 1);

    const nameQuery = (params.name || params.q || "").trim();

    const company = params.company?.trim() || undefined;
    const title = params.title?.trim() || undefined;
    const website = params.website?.trim() || undefined;
    const location = params.location?.trim() || undefined;

    const hasNarrowingFields = !!(company || title || website || location);

    if (!nameQuery && !hasNarrowingFields) {
      return { contacts: [], count: 0, query: "", hasNextPage: false };
    }

    // Multi-search: pass every filled field so Typesense ranks by combined relevance
    const multiResult = await this.multiSearchService.multiSearch(
      {
        name: nameQuery || undefined,
        company,
        title,
        website,
        location,
      },
      page,
      limit
    );
    const contactsFound = multiResult.results[0]?.found || 0;
    const cacheFound = multiResult.results[1]?.found || 0;
    const typesenseTotalPages = Math.ceil(
      Math.max(contactsFound, cacheFound) / limit
    );

    // Merge by Typesense relevance score (interleaved)
    const rawResults = mergeByRelevanceScore(
      multiResult.results[0],
      multiResult.results[1]
    );

    // Apply post-filtering if narrowing fields are provided
    const results = hasNarrowingFields
      ? postFilterResults(rawResults, params)
      : rawResults;

    // If Typesense has results for this page, return them
    if (results.length > 0) {
      const hasNextPage =
        page < typesenseTotalPages || this.apolloFallbackService.isAvailable;
      return {
        contacts: results.slice(0, limit),
        count: contactsFound + cacheFound,
        query: nameQuery,
        hasNextPage,
      };
    }

    // Typesense exhausted — fall back to Apollo
    const apolloPage =
      page <= typesenseTotalPages ? 1 : page - typesenseTotalPages;
    return this.apolloFallbackService.search(
      params,
      nameQuery,
      apolloPage,
      limit
    );
  }
}
