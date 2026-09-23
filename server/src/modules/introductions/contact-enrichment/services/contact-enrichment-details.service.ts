import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq, and, isNull, count } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import {
  parseEnrichmentSource,
  type ContactDetailsResponse,
} from "../contact-enrichment.types";
import { buildContactDetailsResponse } from "../contact-enrichment.helpers";

type DrizzleDb = typeof import("database/db").db;

@Injectable()
export class ContactEnrichmentDetailsService {
  private readonly logger = new Logger(ContactEnrichmentDetailsService.name);

  /**
   * Fetch a contact with its enrichment data (curated fields).
   * Joins contacts + contact_enrichments and returns a flat merged response.
   * Returns null if contact not found or deleted.
   */
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDb) {}

  async getContactWithEnrichment(
    contactId: number
  ): Promise<ContactDetailsResponse | null> {
    try {
      const result = await this.db
        .select({
          // Contact fields
          id: schema.contacts.id,
          firstName: schema.contacts.firstName,
          lastName: schema.contacts.lastName,
          title: schema.contacts.title,
          company: schema.contacts.company,
          city: schema.contacts.city,
          state: schema.contacts.state,
          country: schema.contacts.country,
          location: schema.contacts.location,
          linkedin: schema.contacts.linkedin,
          profilePhotoUrl: schema.contacts.profilePhotoUrl,
          companyDomain: schema.contacts.companyDomain,
          companyIndustry: schema.contacts.companyIndustry,
          companyDescription: schema.contacts.companyDescription,
          companyLinkedinUrl: schema.contacts.companyLinkedinUrl,
          companyType: schema.contacts.companyType,
          employees: schema.contacts.employees,
          website: schema.contacts.website,
          industry: schema.contacts.industry,
          linkedinConnections: schema.contacts.linkedinConnections,
          bountyAmount: schema.contacts.bountyAmount,
          email: schema.contacts.email,
          // Enrichment fields
          enrichmentStatus: schema.contactEnrichments.enrichmentStatus,
          enrichmentSource: schema.contactEnrichments.enrichmentSource,
          enrichmentResponse: schema.contactEnrichments.enrichmentResponse,
        })
        .from(schema.contacts)
        .leftJoin(
          schema.contactEnrichments,
          eq(schema.contacts.id, schema.contactEnrichments.contactId)
        )
        .where(
          and(
            eq(schema.contacts.id, contactId),
            isNull(schema.contacts.deletedAt)
          )
        )
        .limit(1);

      if (!result[0]) return null;

      const row = result[0];
      const enrichmentResponse =
        (row.enrichmentResponse as Record<string, unknown>) ?? null;
      const enrichmentStatus = row.enrichmentStatus ?? "pending";
      const enrichmentSource = parseEnrichmentSource(row.enrichmentSource);
      const hasEmail = row.email != null && row.email.trim() !== "";

      // Count connectors for this contact
      const [connectorResult] = await this.db
        .select({ total: count() })
        .from(schema.contactRelationships)
        .where(eq(schema.contactRelationships.contactId, contactId));

      const connectorCount = Number(connectorResult?.total ?? 0);

      return buildContactDetailsResponse(
        row as unknown as schema.Contact,
        enrichmentStatus,
        enrichmentResponse,
        connectorCount,
        hasEmail,
        enrichmentSource
      );
    } catch (error) {
      this.logger.error(
        `CONTACT_ENRICHMENT_DETAILS :: GET_CONTACT_WITH_ENRICHMENT : ERROR : ${error}`
      );
      return null;
    }
  }
}
