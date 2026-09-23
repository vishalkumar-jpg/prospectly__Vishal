import { Injectable, Logger } from "@nestjs/common";
import { TypesenseSearchParams } from "modules/typesense/core/typesense.types";
import { ApolloCacheDocument } from "modules/typesense/core/typesense.types";
import { ApolloApiService } from "./apollo-api.service";
import { splitDomain } from "./apollo-search.utils";
import {
  ApolloSearchParams,
  ApolloPersonResult,
  ApolloSearchResponse,
} from "./apollo.types";
import {
  APOLLO_SEARCH_ENDPOINT,
  APOLLO_DEFAULT_PER_PAGE,
} from "./apollo.constants";

@Injectable()
export class ApolloSearchService {
  private readonly logger = new Logger(ApolloSearchService.name);

  constructor(private readonly apolloApiService: ApolloApiService) {}

  async searchPeople(
    params: TypesenseSearchParams,
    page = 1,
    perPage: number = APOLLO_DEFAULT_PER_PAGE
  ): Promise<ApolloCacheDocument[]> {
    const apolloParams: ApolloSearchParams = {
      per_page: perPage,
      page,
    };

    if (params.name) {
      apolloParams.q_keywords = params.name;
    }
    if (params.company) {
      apolloParams.q_organization_name = params.company;
    }
    if (params.title) {
      apolloParams.person_titles = [params.title];
    }
    if (params.website) {
      apolloParams.q_organization_domains_list = splitDomain(params.website);
    }
    if (params.location) {
      apolloParams.person_locations = [params.location];
    }
    // If q provided and no name, use q as q_keywords
    if (params.q && !apolloParams.q_keywords) {
      apolloParams.q_keywords = params.q;
    }

    this.logger.log(
      `Searching Apollo with params: ${JSON.stringify(apolloParams)}`
    );

    const response = await this.apolloApiService.post<ApolloSearchResponse>(
      APOLLO_SEARCH_ENDPOINT,
      apolloParams as unknown as Record<string, unknown>
    );

    if (!response.people || response.people.length === 0) {
      return [];
    }

    return response.people.map((person) =>
      this.transformToCacheDocument(person)
    );
  }

  private transformToCacheDocument(
    person: ApolloPersonResult
  ): ApolloCacheDocument {
    return {
      id: person.id,
      first_name: person.first_name || "",
      last_name: person.last_name_obfuscated || "",
      title: person.title || "",
      has_email: person.has_email === true,
      has_direct_phone: !!person.has_direct_phone,
      company: person.organization?.name || "",
      has_industry: person.organization?.has_industry === true,
      has_revenue: person.organization?.has_revenue === true,
      has_employee_count: person.organization?.has_employee_count === true,
      bounty_amount: 0,
    };
  }
}
