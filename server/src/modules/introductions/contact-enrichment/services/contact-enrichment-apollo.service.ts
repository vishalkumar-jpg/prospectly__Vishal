import { Injectable, Logger } from "@nestjs/common";
import { ApolloApiService } from "modules/apollo/apollo-api.service";
import type {
  ApolloMatchPerson,
  ApolloMatchResponse,
} from "../contact-enrichment.types";
import { CONTACT_ENRICHMENT_CONSTANTS } from "../contact-enrichment.constants";

@Injectable()
export class ContactEnrichmentApolloService {
  private readonly logger = new Logger(ContactEnrichmentApolloService.name);

  constructor(private readonly apolloApiService: ApolloApiService) {}

  /**
   * Call Apollo people/match API to enrich a contact.
   * Pass either apolloId (for apollo-source) or linkedinUrl (for contacts-source).
   */
  async matchPerson(params: {
    apolloId?: string;
    linkedinUrl?: string;
  }): Promise<ApolloMatchPerson | null> {
    const body: Record<string, unknown> = {};

    if (params.apolloId) {
      body.id = params.apolloId;
    }
    if (params.linkedinUrl) {
      body.linkedin_url = params.linkedinUrl;
    }

    this.logger.log(`ENRICHING PERSON CREDIT USED: ${JSON.stringify(body)}`);

    try {
      const response = await this.apolloApiService.post<ApolloMatchResponse>(
        CONTACT_ENRICHMENT_CONSTANTS.APOLLO_MATCH_ENDPOINT,
        body
      );

      return response.person ?? null;
    } catch (error) {
      this.logger.error(
        `CONTACT_ENRICHMENT_APOLLO_SERVICE :: MATCH_PERSON : ERROR : ${error}`
      );
      throw error;
    }
  }
}
