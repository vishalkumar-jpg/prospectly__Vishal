import { Injectable, Inject, ConflictException, Logger } from "@nestjs/common";
import { eq, and, desc, inArray } from "drizzle-orm";
import * as schema from "database/schema";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { UserConfigurationsService } from "modules/user-configurations/user-configurations.service";

@Injectable()
export class ContactsImportService {
  private readonly logger = new Logger(ContactsImportService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly userConfigurationsService: UserConfigurationsService
  ) {}

  /**
   * Check if there is an active import (pending or processing) for a user and provider.
   * @param userId - User ID
   * @param provider - Provider name (google, microsoft, apple)
   * @returns True if an active import exists, false otherwise
   */
  async hasActiveImport(userId: string, provider: string): Promise<boolean> {
    const activeImport = await this.db.query.contactsImports.findFirst({
      where: and(
        eq(schema.contactsImports.userId, userId),
        eq(schema.contactsImports.provider, provider),
        inArray(schema.contactsImports.status, ["pending", "processing"])
      ),
    });

    return !!activeImport;
  }

  /**
   * Active import for the same OAuth/credential row only (allows parallel imports per account).
   */
  async hasActiveImportForToken(
    userId: string,
    provider: string,
    tokenId: string
  ): Promise<boolean> {
    const activeImport = await this.db.query.contactsImports.findFirst({
      where: and(
        eq(schema.contactsImports.userId, userId),
        eq(schema.contactsImports.provider, provider),
        eq(schema.contactsImports.tokenId, tokenId),
        inArray(schema.contactsImports.status, ["pending", "processing"])
      ),
    });

    return !!activeImport;
  }

  async createContactsImport(data: {
    userId: string;
    provider: string;
    integrationId?: string | null;
    tokenId?: string | null;
    status: string;
    email?: string;
  }): Promise<string> {
    const hasActive = data.tokenId
      ? await this.hasActiveImportForToken(
          data.userId,
          data.provider,
          data.tokenId
        )
      : await this.hasActiveImport(data.userId, data.provider);
    if (hasActive) {
      throw new ConflictException(
        `Contacts import is already in progress for ${data.provider}. Please wait for the current import to complete.`
      );
    }

    const values: {
      userId: string;
      provider: string;
      integrationId: string | null;
      tokenId: string | null;
      status: string;
      email?: string;
    } = {
      userId: data.userId,
      provider: data.provider,
      integrationId: data.integrationId || null,
      tokenId: data.tokenId || null,
      status: data.status,
    };

    if (data.email) {
      values.email = data.email;
    }

    const [importRecord] = await this.db
      .insert(schema.contactsImports)
      .values(values)
      .returning({ id: schema.contactsImports.id });

    return importRecord.id;
  }

  async updateContactsImport(
    id: string,
    data: {
      status?: string;
      imported?: number;
      failed?: number;
      duplicates?: number;
      totalFetched?: number;
      errorMessage?: string | null;
      startedAt?: Date;
      completedAt?: Date;
      email?: string;
    }
  ): Promise<void> {
    const updateData: Record<string, unknown> = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.imported !== undefined) updateData.imported = data.imported;
    if (data.failed !== undefined) updateData.failed = data.failed;
    if (data.duplicates !== undefined) updateData.duplicates = data.duplicates;
    if (data.totalFetched !== undefined)
      updateData.totalFetched = data.totalFetched;
    if (data.errorMessage !== undefined)
      updateData.errorMessage = data.errorMessage;
    if (data.startedAt !== undefined) updateData.startedAt = data.startedAt;
    if (data.completedAt !== undefined)
      updateData.completedAt = data.completedAt;
    if (data.email !== undefined) updateData.email = data.email;

    await this.db
      .update(schema.contactsImports)
      .set(updateData)
      .where(eq(schema.contactsImports.id, id));

    if (data.status === "completed") {
      try {
        const record = await this.getContactsImportById(id);
        if (record?.userId) {
          await this.userConfigurationsService.updateUserConfiguration(
            record.userId,
            { hasImportedContacts: true }
          );
        }
      } catch (error) {
        this.logger.error(
          `CONTACTS_IMPORT_SERVICE :: updateContactsImport :: HAS_IMPORTED_CONTACTS : ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  async getContactsImportById(
    importId: string
  ): Promise<typeof schema.contactsImports.$inferSelect | null> {
    const importRecord = await this.db.query.contactsImports.findFirst({
      where: eq(schema.contactsImports.id, importId),
    });

    return importRecord || null;
  }

  async getLatestContactsImport(
    userId: string,
    provider?: string,
    tokenId?: string | null
  ): Promise<typeof schema.contactsImports.$inferSelect | null> {
    const conditions = [eq(schema.contactsImports.userId, userId)];

    if (provider) {
      conditions.push(eq(schema.contactsImports.provider, provider));
    }
    if (tokenId) {
      conditions.push(eq(schema.contactsImports.tokenId, tokenId));
    }

    const importRecord = await this.db.query.contactsImports.findFirst({
      where: and(...conditions),
      orderBy: desc(schema.contactsImports.createdAt),
    });

    return importRecord || null;
  }

  async getContactsImportStats(
    userId: string,
    provider?: string
  ): Promise<{
    latestImport: typeof schema.contactsImports.$inferSelect | null;
    integration: typeof schema.calendarIntegrations.$inferSelect | null;
  }> {
    const latestImport = await this.getLatestContactsImport(userId, provider);

    let integration = null;
    if (latestImport?.integrationId) {
      integration = await this.db.query.calendarIntegrations.findFirst({
        where: eq(schema.calendarIntegrations.id, latestImport.integrationId),
      });
    }

    return {
      latestImport,
      integration,
    };
  }

  /**
   * Get import history for a user, optionally filtered by provider.
   */
  async getContactsImportHistory(
    userId: string,
    provider?: string
  ): Promise<Array<typeof schema.contactsImports.$inferSelect>> {
    const conditions = [eq(schema.contactsImports.userId, userId)];

    if (provider) {
      conditions.push(eq(schema.contactsImports.provider, provider));
    }

    const imports = await this.db.query.contactsImports.findMany({
      where: and(...conditions),
      orderBy: desc(schema.contactsImports.createdAt),
    });

    return imports;
  }
}
