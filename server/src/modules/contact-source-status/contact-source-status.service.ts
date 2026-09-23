import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "database/schema";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { ContactsProviderTokensService } from "modules/contact-queue/contacts-provider-tokens.service";
import { ContactsImportService } from "modules/contact-queue/contacts-import.service";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { appConfig } from "config/app.config";
import {
  CONTACT_SOURCE_STATUS_MESSAGES,
  PROVIDER_TO_SOURCE,
} from "./contact-source-status.constants";
import {
  ContactSourceStatus,
  ImportStatus,
} from "./contact-source-status.types";

@Injectable()
export class ContactSourceStatusService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly contactsProviderTokensService: ContactsProviderTokensService,
    private readonly contactsImportService: ContactsImportService
  ) {}

  /**
   * Check if user has active provider tokens for a given provider
   * @deprecated Use ContactsProviderTokensService.hasTokens directly if possible
   */
  async hasActiveProviderTokens(
    userId: string,
    provider: string
  ): Promise<boolean> {
    return this.contactsProviderTokensService.hasTokens(userId, provider);
  }

  /**
   * Get contact count by source for a user
   * Queries contact_import_snapshots via contact_relationships
   */
  async getContactCountBySource(
    userId: string,
    source: string
  ): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(schema.contactImportSnapshots)
      .innerJoin(
        schema.contactRelationships,
        eq(
          schema.contactImportSnapshots.relationshipId,
          schema.contactRelationships.id
        )
      )
      .where(
        and(
          eq(schema.contactRelationships.userId, userId),
          eq(schema.contactImportSnapshots.sourceType, source)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Get contact sources status for a user
   * Returns array of source status objects with connection status, contact counts, and import status
   */
  async getContactSourcesStatus(
    userId: string
  ): Promise<ContactSourceStatus[]> {
    // Fetch all contact counts in one query
    const counts = await this.db
      .select({
        source: schema.contactImportSnapshots.sourceType,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(schema.contactImportSnapshots)
      .innerJoin(
        schema.contactRelationships,
        eq(
          schema.contactImportSnapshots.relationshipId,
          schema.contactRelationships.id
        )
      )
      .where(eq(schema.contactRelationships.userId, userId))
      .groupBy(schema.contactImportSnapshots.sourceType);

    const countMap = counts.reduce(
      (acc, curr) => {
        if (curr.source) acc[curr.source] = curr.count;
        return acc;
      },
      {} as Record<string, number>
    );

    // Map provider names to database format (capitalized -> lowercase)
    const providerToDbName: Record<string, string> = {
      Google: "google",
      Microsoft: "microsoft",
      Apple: "apple",
      LinkedIn: "linkedin",
    };

    const statusPromises = Object.keys(PROVIDER_TO_SOURCE).map(
      async (provider) => {
        const source = PROVIDER_TO_SOURCE[provider];

        if (!source) {
          throw new NotFoundException(
            CONTACT_SOURCE_STATUS_MESSAGES.ERROR.INVALID_PROVIDER
          );
        }

        // Get latest import status for this provider
        const dbProviderName = providerToDbName[provider];
        const latestImport = dbProviderName
          ? await this.contactsImportService.getLatestContactsImport(
              userId,
              dbProviderName
            )
          : null;

        // Check if user has active tokens for this provider
        // LinkedIn doesn't use tokens, so check if there's an import record instead
        // Use dbProviderName (lowercase) to match how tokens are stored in the DB
        const isActive =
          provider === "LinkedIn"
            ? !!latestImport
            : dbProviderName
              ? await this.hasActiveProviderTokens(userId, dbProviderName)
              : false;

        const isOAuthContactProvider =
          provider === "Google" ||
          provider === "Microsoft" ||
          provider === "Apple";

        const connectedAccountCount =
          isOAuthContactProvider && dbProviderName
            ? await this.contactsProviderTokensService.countActiveForProvider(
                userId,
                dbProviderName
              )
            : undefined;

        // Get contact count for this source
        const contactCount = countMap[source] || 0;

        // Validate and cast status to the expected union type
        const validStatuses: ImportStatus[] = [
          "pending",
          "processing",
          "completed",
          "failed",
        ];
        const isValidStatus = (status: string): status is ImportStatus => {
          return validStatuses.includes(status as ImportStatus);
        };

        const importStatus: ImportStatus | null =
          latestImport?.status && isValidStatus(latestImport.status)
            ? latestImport.status
            : null;

        // Create properly typed latestImport object if it exists and has valid status
        const typedLatestImport =
          latestImport && isValidStatus(latestImport.status)
            ? {
                id: latestImport.id,
                status: latestImport.status,
                imported: latestImport.imported,
                failed: latestImport.failed,
                duplicates: latestImport.duplicates,
                totalFetched: latestImport.totalFetched,
                errorMessage: latestImport.errorMessage ?? null,
                startedAt: latestImport.startedAt ?? null,
                completedAt: latestImport.completedAt ?? null,
                createdAt: latestImport.createdAt,
              }
            : undefined;

        const status: ContactSourceStatus = {
          source: provider,
          isActive,
          contactCount,
          importStatus,
          imported: latestImport?.imported || 0,
          failed: latestImport?.failed || 0,
          duplicates: latestImport?.duplicates || 0,
          totalFetched: latestImport?.totalFetched || 0,
          importStartedAt: latestImport?.startedAt || null,
          importCompletedAt: latestImport?.completedAt || null,
          importErrorMessage: latestImport?.errorMessage || null,
          latestImport: typedLatestImport,
          connectedAccountCount,
          maxConnectedAccountsPerProvider: isOAuthContactProvider
            ? appConfig.contactImportMaxAccountsPerProvider
            : undefined,
        };

        return status;
      }
    );

    return Promise.all(statusPromises);
  }
}
