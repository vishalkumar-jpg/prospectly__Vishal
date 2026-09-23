import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq, and, or, isNull } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import {
  contacts,
  contactRelationships,
  contactEnrichments,
} from "database/schema";
import { toUTC } from "utils/dayjs";
import { calculateMedian } from "services/bountyCalculationUtils";
import type { BountyContactData } from "./bounty-contact-data.types";
import { extractEnrichmentData } from "./extract-enrichment-data";

// Type for the injected db instance
type DrizzleDb = typeof import("database/db").db;

@Injectable()
export class BountyDbUpdaterService {
  private readonly logger = new Logger(BountyDbUpdaterService.name);

  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDb) {}

  /**
   * Fetch contact details + enrichment data needed for Gemini bounty calculation.
   * LEFT JOINs contact_enrichments to pull rich Apollo data from the JSONB column.
   */
  async fetchContactDetails(
    contactId: string
  ): Promise<BountyContactData | null> {
    try {
      const result = await this.db
        .select({
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          company: contacts.company,
          title: contacts.title,
          linkedin: contacts.linkedin,
          industry: contacts.industry,
          website: contacts.website,
          companyDomain: contacts.companyDomain,
          companyIndustry: contacts.companyIndustry,
          companyDescription: contacts.companyDescription,
          companyType: contacts.companyType,
          location: contacts.location,
          companyLinkedinUrl: contacts.companyLinkedinUrl,
          linkedinConnections: contacts.linkedinConnections,
          employees: contacts.employees,
          bountyAmount: contacts.bountyAmount,
          enrichmentResponse: contactEnrichments.enrichmentResponse,
        })
        .from(contacts)
        .leftJoin(
          contactEnrichments,
          eq(contactEnrichments.contactId, contacts.id)
        )
        .where(
          and(eq(contacts.id, Number(contactId)), isNull(contacts.deletedAt))
        )
        .limit(1);

      if (result.length === 0) return null;

      const row = result[0];

      // Base contact fields from contacts table
      const baseData: BountyContactData = {
        first_name: row.firstName ?? undefined,
        last_name: row.lastName ?? undefined,
        company: row.company ?? undefined,
        title: row.title ?? undefined,
        linkedin: row.linkedin ?? undefined,
        industry: row.industry ?? undefined,
        website: row.website ?? undefined,
        company_domain: row.companyDomain ?? undefined,
        company_industry: row.companyIndustry ?? undefined,
        company_description: row.companyDescription ?? undefined,
        company_type: row.companyType ?? undefined,
        location: row.location ?? undefined,
        company_linkedin_url: row.companyLinkedinUrl ?? undefined,
        linkedin_connections: row.linkedinConnections ?? undefined,
        employees: row.employees ?? undefined,
        bounty_amount: row.bountyAmount ?? undefined,
      };

      // Merge enrichment-derived fields from JSONB (seniority, revenue, etc.)
      const enrichmentData = extractEnrichmentData(row.enrichmentResponse);

      return { ...baseData, ...enrichmentData };
    } catch (error) {
      this.logger.error(
        `BOUNTY_DB_UPDATER :: FETCH_CONTACT_DETAILS : ERROR : ${error}`
      );
      return null;
    }
  }

  /**
   * Update bounty for a contact after Gemini calculation.
   * - No relationships: set contacts.bountyAmount directly with Gemini value.
   * - With relationships: update 0/null relationships, then calculate median
   *   including the Gemini value as an additional data point.
   */
  async updateContactBounty(
    contactId: number,
    bountyAmount: number
  ): Promise<number> {
    try {
      const finalBounty = await this.db.transaction(async (tx) => {
        // Check if any contact_relationships exist for this contact
        const relationships = await tx
          .select({ bountyAmount: contactRelationships.bountyAmount })
          .from(contactRelationships)
          .where(eq(contactRelationships.contactId, contactId));

        this.logger.debug(
          `BOUNTY_DB_UPDATER :: UPDATE_CONTACT_BOUNTY : Contact ${contactId} has ${relationships.length} relationships`
        );

        if (relationships.length === 0) {
          // No relationships — set contacts.bountyAmount directly
          await tx
            .update(contacts)
            .set({
              bountyAmount: bountyAmount.toString(),
              updatedAt: toUTC(),
              isTypesenseSynced: false,
            })
            .where(eq(contacts.id, contactId));

          this.logger.debug(
            `BOUNTY_DB_UPDATER :: UPDATE_CONTACT_BOUNTY : Setting bountyAmount directly to ${bountyAmount} for contact ${contactId}`
          );

          return bountyAmount;
        }

        // Has relationships — update those with 0 or null bounty
        await tx
          .update(contactRelationships)
          .set({
            bountyAmount: bountyAmount.toString(),
            bountyStatus: "calculated",
            updatedAt: toUTC(),
          })
          .where(
            and(
              eq(contactRelationships.contactId, contactId),
              or(
                eq(contactRelationships.bountyAmount, "0"),
                isNull(contactRelationships.bountyAmount)
              )
            )
          );

        // Re-fetch all relationship bounties after the update
        const updatedRelationships = await tx
          .select({ bountyAmount: contactRelationships.bountyAmount })
          .from(contactRelationships)
          .where(eq(contactRelationships.contactId, contactId));

        // Build bounty values array: all relationship bounties + Gemini value
        const bountyValues = updatedRelationships
          .map((rel) => {
            const value = rel.bountyAmount ? Number(rel.bountyAmount) : 0;
            return isNaN(value) ? 0 : value;
          })
          .filter((value) => value >= 0);

        bountyValues.push(bountyAmount);

        const median = calculateMedian(bountyValues);

        // Update contacts.bountyAmount with the calculated median
        await tx
          .update(contacts)
          .set({
            bountyAmount: median.toString(),
            updatedAt: toUTC(),
            isTypesenseSynced: false,
          })
          .where(eq(contacts.id, contactId));

        this.logger.debug(
          `BOUNTY_DB_UPDATER :: UPDATE_CONTACT_BOUNTY : Calculated median ${median} from ${updatedRelationships.length} relationships + Gemini value for contact ${contactId}`
        );

        return median;
      });

      return finalBounty;
    } catch (error) {
      this.logger.error(
        `BOUNTY_DB_UPDATER :: UPDATE_CONTACT_BOUNTY : ERROR : ${error}`
      );
      return 0;
    }
  }
}
