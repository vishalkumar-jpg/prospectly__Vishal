import { Injectable, Inject, Logger } from "@nestjs/common";
import { Client } from "typesense";
import { normalizeWebsite } from "modules/typesense/search/typesense-search.utils";
import {
  TYPESENSE_TOKEN,
  TYPESENSE_COLLECTION_NAME,
  APOLLO_CACHE_COLLECTION_NAME,
} from "../../core/typesense.constants";
import { TypesenseSearchResult } from "../../core/typesense.types";

export interface MultiSearchFields {
  name?: string;
  company?: string;
  title?: string;
  website?: string;
  location?: string;
}

interface FieldSpec {
  schemaFields: string[];
  weight: number;
  typos: number;
  value: string;
}

@Injectable()
export class TypesenseMultiSearchService {
  private readonly logger = new Logger(TypesenseMultiSearchService.name);

  constructor(
    @Inject(TYPESENSE_TOKEN)
    private readonly client: Client
  ) {}

  private buildQueryParamsForCollection(
    fields: MultiSearchFields,
    options: { includeLocation: boolean }
  ): {
    q: string;
    query_by: string;
    query_by_weights: string;
    num_typos: string;
  } | null {
    const specs: FieldSpec[] = [];

    const name = fields.name?.trim();
    if (name) {
      specs.push({
        schemaFields: ["first_name", "last_name"],
        weight: 4,
        typos: 1,
        value: name,
      });
    }

    const company = fields.company?.trim();
    if (company) {
      specs.push({
        schemaFields: ["company"],
        weight: 3,
        typos: 0,
        value: company,
      });
    }

    const title = fields.title?.trim();
    if (title) {
      specs.push({
        schemaFields: ["title"],
        weight: 2,
        typos: 0,
        value: title,
      });
    }

    const website = fields.website?.trim();
    if (website) {
      const normalizedWebsite = normalizeWebsite(website);
      if (normalizedWebsite) {
        specs.push({
          schemaFields: ["website"],
          weight: 1,
          typos: 0,
          value: normalizedWebsite,
        });
      }
    }

    const location = fields.location?.trim();
    if (options.includeLocation && location) {
      specs.push({
        schemaFields: ["location", "city", "state", "country"],
        weight: 2,
        typos: 1,
        value: location,
      });
    }

    if (specs.length === 0) return null;

    const queryBy: string[] = [];
    const weights: number[] = [];
    const typos: number[] = [];
    for (const spec of specs) {
      for (const schemaField of spec.schemaFields) {
        queryBy.push(schemaField);
        weights.push(spec.weight);
        typos.push(spec.typos);
      }
    }

    const q = specs.map((s) => s.value).join(" ");

    return {
      q,
      query_by: queryBy.join(","),
      query_by_weights: weights.join(","),
      num_typos: typos.join(","),
    };
  }

  async multiSearch(
    fields: MultiSearchFields,
    page = 1,
    perPage = 50
  ): Promise<{ results: TypesenseSearchResult[] }> {
    const emptySlot: TypesenseSearchResult = { hits: [], found: 0 };
    try {
      // Contacts collection supports location fields; apollo_cache does not.
      const contactsQuery = this.buildQueryParamsForCollection(fields, {
        includeLocation: true,
      });
      const apolloCacheQuery = this.buildQueryParamsForCollection(fields, {
        includeLocation: false,
      });

      if (!contactsQuery && !apolloCacheQuery) {
        return { results: [emptySlot, emptySlot] };
      }

      const sharedExtras = {
        prioritize_exact_match: true,
        prioritize_token_position: true,
        text_match_type: "sum_score",
        per_page: perPage,
        page,
      };

      const searches: Record<string, unknown>[] = [];
      const slotMap: ("contacts" | "apolloCache")[] = [];

      if (contactsQuery) {
        searches.push({
          ...contactsQuery,
          ...sharedExtras,
          collection: TYPESENSE_COLLECTION_NAME,
          filter_by: "has_linkedin:true",
        });
        slotMap.push("contacts");
      }

      if (apolloCacheQuery) {
        searches.push({
          ...apolloCacheQuery,
          ...sharedExtras,
          collection: APOLLO_CACHE_COLLECTION_NAME,
          filter_by: "has_email:true",
        });
        slotMap.push("apolloCache");
      }

      const result = (await this.client.multiSearch.perform(
        { searches },
        {}
      )) as unknown as { results: TypesenseSearchResult[] };

      // Re-assemble into the fixed [contacts, apolloCache] shape so consumers
      // can index by slot regardless of whether a collection was skipped.
      const contactsIdx = slotMap.indexOf("contacts");
      const apolloIdx = slotMap.indexOf("apolloCache");
      return {
        results: [
          contactsIdx >= 0 ? result.results[contactsIdx] : emptySlot,
          apolloIdx >= 0 ? result.results[apolloIdx] : emptySlot,
        ],
      };
    } catch (error) {
      this.logger.error(
        `TYPESENSE_MULTI_SEARCH_SERVICE :: MULTI_SEARCH : ERROR : ${error}`
      );
      return { results: [emptySlot, emptySlot] };
    }
  }
}
