import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import type { EnrichContactDto } from "../contact-enrichment.dto";
import type { EnrichContactResponse } from "../contact-enrichment.types";
import { ContactEnrichmentApolloService } from "./contact-enrichment-apollo.service";
import { ContactEnrichmentDbService } from "./contact-enrichment-db.service";
import { ContactEnrichmentTypesenseService } from "./contact-enrichment-typesense.service";
import { CONTACT_ENRICHMENT_MESSAGES } from "../contact-enrichment.constants";
import {
  buildEnrichContactResponse,
  extractEmailsFromApollo,
} from "../contact-enrichment.helpers";

type DrizzleDb = typeof import("database/db").db;

@Injectable()
export class ContactEnrichmentService {
  private readonly logger = new Logger(ContactEnrichmentService.name);

  constructor(
    private readonly apolloService: ContactEnrichmentApolloService,
    private readonly dbService: ContactEnrichmentDbService,
    private readonly typesenseService: ContactEnrichmentTypesenseService,
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDb
  ) {}

  async enrichContact(
    dto: EnrichContactDto,
    userId: string
  ): Promise<EnrichContactResponse> {
    // 0. Guard: if contacts source and already enriched, return existing data
    if (dto.source === "contacts") {
      const status = await this.dbService.getEnrichmentStatus(Number(dto.id));
      if (status === "completed") {
        const existing = await this.dbService.getContactById(Number(dto.id));
        if (existing) {
          return buildEnrichContactResponse(existing, "completed");
        }
      }
    }

    // 0b. Guard: if apollo source and already enriched, return existing data
    if (dto.source === "apollo") {
      const existingContactId =
        await this.dbService.findContactByExternalPersonId(dto.id);
      if (existingContactId) {
        const existing = await this.dbService.getContactById(existingContactId);
        if (existing) {
          return buildEnrichContactResponse(existing, "completed");
        }
      }
    }

    // 1. Determine Apollo match params based on source
    const matchParams = await this.resolveMatchParams(dto);

    // 2. Call Apollo people/match API
    const apolloData = await this.apolloService.matchPerson(matchParams);
    if (!apolloData) {
      throw new BadRequestException(
        CONTACT_ENRICHMENT_MESSAGES.ERROR.APOLLO_NO_MATCH
      );
    }

    // 3. Extract all emails from Apollo response (prioritized + deduplicated)
    const extractedEmails = extractEmailsFromApollo(apolloData);

    // 4. Determine target contact ID and operation type
    let contactId: number;
    let isUpdate: boolean;

    if (dto.source === "contacts") {
      // From database
      contactId = Number(dto.id);
      isUpdate = true;
    } else {
      // Apollo source: dedup check by LinkedIn hash + all extracted emails
      const existingId = await this.dbService.findExistingContact(
        apolloData.linkedin_url,
        extractedEmails
      );

      if (existingId) {
        contactId = existingId;
        isUpdate = true;
      } else {
        contactId = 0; // Will be set during creation
        isUpdate = false;
      }
    }

    // 5. DB Transaction: create/update contact + sensitive data + enrichment
    const finalContactId = await this.db.transaction(async (tx) => {
      if (isUpdate) {
        await this.dbService.updateContactNullableFields(
          tx,
          contactId,
          apolloData,
          extractedEmails
        );
        await this.dbService.upsertSensitiveData(
          tx,
          contactId,
          apolloData,
          extractedEmails
        );
      } else {
        contactId = await this.dbService.createNewContact(
          tx,
          apolloData,
          extractedEmails
        );
        await this.dbService.upsertSensitiveData(
          tx,
          contactId,
          apolloData,
          extractedEmails
        );
      }

      await this.dbService.upsertEnrichmentRecord(
        tx,
        contactId,
        apolloData,
        userId
      );

      return contactId;
    });

    // 6. Typesense sync (after DB commit, best-effort)
    await this.typesenseService.syncEnrichedContact(finalContactId);

    // 7. Clean up apollo cache to prevent duplicate search results
    if (dto.source === "apollo") {
      await this.typesenseService.deleteFromApolloCache(dto.id);
    }

    // 8. Fetch final contact and build response
    const contact = await this.dbService.getContactById(finalContactId);
    if (!contact) {
      throw new BadRequestException(
        CONTACT_ENRICHMENT_MESSAGES.ERROR.CONTACT_NOT_FOUND
      );
    }

    return buildEnrichContactResponse(contact, "completed");
  }

  /**
   * Resolve Apollo match parameters based on source type.
   * - contacts: use LinkedIn URL from DTO or DB
   * - apollo: use DTO id as Apollo person ID
   */
  private async resolveMatchParams(
    dto: EnrichContactDto
  ): Promise<{ apolloId?: string; linkedinUrl?: string }> {
    if (dto.source === "apollo") {
      return { apolloId: dto.id };
    }

    // Contacts source: get LinkedIn URL
    let linkedinUrl = dto.linkedin_url;

    if (!linkedinUrl) {
      const contact = await this.dbService.getContactById(Number(dto.id));
      if (!contact) {
        throw new BadRequestException(
          CONTACT_ENRICHMENT_MESSAGES.ERROR.CONTACT_NOT_FOUND
        );
      }
      linkedinUrl = contact.linkedin ?? undefined;
    }

    return { linkedinUrl };
  }
}
