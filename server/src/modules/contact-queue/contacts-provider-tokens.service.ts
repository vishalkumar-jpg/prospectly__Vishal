import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { eq, and, desc, sql, ne, or, isNull } from "drizzle-orm";
import * as schema from "database/schema";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { EncryptionService } from "shared/encryption.service";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Logger } from "@nestjs/common";
import { toUTC } from "utils/dayjs";
import { appConfig } from "config/app.config";
import { normalizeImportAccountEmail } from "utils/contact-import-account.utils";

export interface ProviderTokens {
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  email?: string;
  isPrimary?: boolean;
}

@Injectable()
export class ContactsProviderTokensService {
  private readonly logger = new Logger(ContactsProviderTokensService.name);
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly encryptionService: EncryptionService
  ) {}

  /**
   * Prefer active rows, then primary, then most recently updated.
   */
  private sortTokenRowsForDefault<
    T extends {
      id: string;
      isActive: boolean;
      isPrimary: boolean;
      updatedAt: Date;
    },
  >(rows: T[]): T[] {
    return [...rows].sort((a, b) => {
      const activeCmp = Number(b.isActive) - Number(a.isActive);
      if (activeCmp !== 0) {
        return activeCmp;
      }
      const aPri = a.isPrimary ? 1 : 0;
      const bPri = b.isPrimary ? 1 : 0;
      if (aPri !== bPri) {
        return bPri - aPri;
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }

  /**
   * Get or create a token record for a user and provider.
   * When `tokens.email` is set, upserts by normalized email. Otherwise legacy single-row behavior.
   */
  async getOrCreateTokenRecord(
    userId: string,
    provider: string,
    tokens?: ProviderTokens
  ): Promise<string> {
    const normalized = normalizeImportAccountEmail(tokens?.email);

    if (tokens && normalized) {
      const existing = await this.findByUserProviderEmail(
        userId,
        provider,
        normalized,
        true
      );
      if (existing) {
        return this.mergeTokensIntoRecord(
          existing,
          tokens,
          normalized,
          userId,
          provider
        );
      }

      const orphanRow = await this.resolveNullableEmailTokenRowForBackfill(
        userId,
        provider
      );
      if (orphanRow) {
        this.logger.log(
          `Backfilling email on contact_provider_tokens ${orphanRow.id} (${provider}, user ${userId})`
        );
        return this.mergeTokensIntoRecord(
          orphanRow,
          tokens,
          normalized,
          userId,
          provider
        );
      }

      const activeCount = await this.countActiveForProvider(userId, provider);
      if (activeCount >= appConfig.contactImportMaxAccountsPerProvider) {
        throw new ConflictException(
          `Maximum of ${appConfig.contactImportMaxAccountsPerProvider} connected ${provider} import accounts reached.`
        );
      }

      const encryptedAccessToken = this.encryptionService.encryptContactData(
        tokens.accessToken
      );
      const encryptedRefreshToken = tokens.refreshToken
        ? this.encryptionService.encryptContactData(tokens.refreshToken)
        : null;

      const isPrimary = tokens.isPrimary ?? false;

      const [tokenRecord] = await this.db
        .insert(schema.contactsProviderTokens)
        .values({
          userId,
          provider,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: tokens.tokenExpiresAt || null,
          email: normalized,
          isActive: true,
          isPrimary,
        })
        .returning({ id: schema.contactsProviderTokens.id });

      if (isPrimary) {
        await this.clearPrimaryForProviderExcept(
          userId,
          provider,
          tokenRecord.id
        );
      }

      return tokenRecord.id;
    }

    const legacyRows = await this.db.query.contactsProviderTokens.findMany({
      where: and(
        eq(schema.contactsProviderTokens.userId, userId),
        eq(schema.contactsProviderTokens.provider, provider)
      ),
    });

    if (legacyRows.length > 0) {
      const sorted = this.sortTokenRowsForDefault(legacyRows);
      return sorted[0].id;
    }

    if (tokens) {
      const activeCount = await this.countActiveForProvider(userId, provider);
      if (activeCount >= appConfig.contactImportMaxAccountsPerProvider) {
        throw new ConflictException(
          `Maximum of ${appConfig.contactImportMaxAccountsPerProvider} connected ${provider} import accounts reached.`
        );
      }

      const encryptedAccessToken = this.encryptionService.encryptContactData(
        tokens.accessToken
      );
      const encryptedRefreshToken = tokens.refreshToken
        ? this.encryptionService.encryptContactData(tokens.refreshToken)
        : null;

      const [tokenRecord] = await this.db
        .insert(schema.contactsProviderTokens)
        .values({
          userId,
          provider,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: tokens.tokenExpiresAt || null,
          email: tokens.email || null,
          isActive: true,
          isPrimary: tokens.isPrimary ?? false,
        })
        .returning({ id: schema.contactsProviderTokens.id });

      return tokenRecord.id;
    }

    throw new Error(
      `No token record found for user ${userId} and provider ${provider}, and no tokens provided to create one`
    );
  }

  /**
   * Set email on an active token row that still has NULL/blank email (e.g. Google re-login without new refresh_token).
   * Does not change stored access/refresh tokens.
   */
  async backfillNullEmailForActiveProviderAccount(
    userId: string,
    provider: string,
    email: string | null | undefined
  ): Promise<void> {
    const normalized = normalizeImportAccountEmail(email);
    if (!normalized) {
      return;
    }
    const orphanRow = await this.resolveNullableEmailTokenRowForBackfill(
      userId,
      provider
    );
    if (!orphanRow) {
      return;
    }
    await this.updateTokens(orphanRow.id, { email: normalized });
    this.logger.log(
      `Re-login email backfill on contact_provider_tokens ${orphanRow.id} (${provider}, user ${userId})`
    );
  }

  /**
   * Patch token row fields. Omits encryption for fields not provided (e.g. email-only backfill on re-login).
   */
  async updateTokens(
    tokenId: string,
    tokens: Partial<ProviderTokens>
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      updatedAt: toUTC(),
    };

    if (tokens.accessToken) {
      updateData.accessToken = this.encryptionService.encryptContactData(
        tokens.accessToken
      );
    }
    if (tokens.refreshToken !== undefined) {
      updateData.refreshToken = tokens.refreshToken
        ? this.encryptionService.encryptContactData(tokens.refreshToken)
        : null;
    }
    if (tokens.tokenExpiresAt !== undefined) {
      updateData.tokenExpiresAt = tokens.tokenExpiresAt || null;
    }
    if (tokens.email !== undefined) {
      const n = normalizeImportAccountEmail(tokens.email);
      updateData.email = n || null;
    }
    if (tokens.isPrimary !== undefined) {
      updateData.isPrimary = tokens.isPrimary;
    }

    await this.db
      .update(schema.contactsProviderTokens)
      .set(updateData)
      .where(eq(schema.contactsProviderTokens.id, tokenId));
  }

  async getTokens(
    userId: string,
    provider: string
  ): Promise<ProviderTokens | null> {
    const tokenId = await this.getTokenRecordId(userId, provider);
    if (!tokenId) {
      return null;
    }
    return this.getTokensById(tokenId);
  }

  async getTokensById(tokenId: string): Promise<ProviderTokens | null> {
    const tokenRecord = await this.db.query.contactsProviderTokens.findFirst({
      where: eq(schema.contactsProviderTokens.id, tokenId),
    });

    if (!tokenRecord || !tokenRecord.accessToken) {
      return null;
    }

    let decryptedAccessToken: string | null = null;
    let decryptedRefreshToken: string | null = null;

    try {
      decryptedAccessToken = await this.encryptionService.decryptContactData(
        tokenRecord.accessToken
      );
    } catch (error) {
      this.logger.error(
        `Failed to decrypt access token for user ${tokenRecord.userId} and provider ${tokenRecord.provider}: ${error}`
      );
    }

    if (tokenRecord.refreshToken) {
      try {
        decryptedRefreshToken = await this.encryptionService.decryptContactData(
          tokenRecord.refreshToken
        );
      } catch (error) {
        this.logger.error(
          `Failed to decrypt refresh token for user ${tokenRecord.userId} and provider ${tokenRecord.provider}: ${error}`
        );
      }
    }

    if (!decryptedAccessToken && !decryptedRefreshToken) {
      throw new Error("Failed to decrypt both access and refresh tokens");
    }

    return {
      accessToken: decryptedAccessToken || "",
      refreshToken: decryptedRefreshToken,
      tokenExpiresAt: tokenRecord.tokenExpiresAt || null,
      email: tokenRecord.email || null,
    };
  }

  async hasTokens(userId: string, provider: string): Promise<boolean> {
    const n = await this.countActiveForProvider(userId, provider);
    return n > 0;
  }

  async getTokenRecordId(
    userId: string,
    provider: string
  ): Promise<string | null> {
    const rows = await this.db.query.contactsProviderTokens.findMany({
      where: and(
        eq(schema.contactsProviderTokens.userId, userId),
        eq(schema.contactsProviderTokens.provider, provider),
        eq(schema.contactsProviderTokens.isActive, true)
      ),
    });
    if (!rows.length) {
      return null;
    }
    return this.sortTokenRowsForDefault(rows)[0].id;
  }

  async getTokenRecordIdIncludingInactive(
    userId: string,
    provider: string
  ): Promise<string | null> {
    const rows = await this.db.query.contactsProviderTokens.findMany({
      where: and(
        eq(schema.contactsProviderTokens.userId, userId),
        eq(schema.contactsProviderTokens.provider, provider)
      ),
    });
    if (!rows.length) {
      return null;
    }
    return this.sortTokenRowsForDefault(rows)[0].id;
  }

  /**
   * Find token row for login upsert: match normalized email on google/microsoft.
   */
  async findTokenRecordIdForLoginEmail(
    userId: string,
    provider: string,
    loginEmail: string
  ): Promise<string | null> {
    const normalized = normalizeImportAccountEmail(loginEmail);
    if (!normalized) {
      return null;
    }
    const row = await this.findByUserProviderEmail(
      userId,
      provider,
      normalized,
      true
    );
    return row?.id ?? null;
  }

  async deactivateTokens(userId: string, provider: string): Promise<void> {
    await this.db
      .update(schema.contactsProviderTokens)
      .set({
        isActive: false,
        updatedAt: toUTC(),
      })
      .where(
        and(
          eq(schema.contactsProviderTokens.userId, userId),
          eq(schema.contactsProviderTokens.provider, provider)
        )
      );
  }

  async deactivateTokenById(tokenId: string): Promise<void> {
    await this.db
      .update(schema.contactsProviderTokens)
      .set({
        isActive: false,
        updatedAt: toUTC(),
      })
      .where(eq(schema.contactsProviderTokens.id, tokenId));
  }

  async reactivateTokens(userId: string, provider: string): Promise<void> {
    await this.db
      .update(schema.contactsProviderTokens)
      .set({
        isActive: true,
        updatedAt: toUTC(),
      })
      .where(
        and(
          eq(schema.contactsProviderTokens.userId, userId),
          eq(schema.contactsProviderTokens.provider, provider)
        )
      );
  }

  async updateTokenActiveStatus(
    tokenId: string,
    isActive: boolean
  ): Promise<void> {
    await this.db
      .update(schema.contactsProviderTokens)
      .set({
        isActive,
        updatedAt: toUTC(),
      })
      .where(eq(schema.contactsProviderTokens.id, tokenId));
  }

  async getAllActiveTokens(userId: string): Promise<
    Array<{
      id: string;
      provider: string;
      email: string | null;
      tokenExpiresAt: Date | null;
    }>
  > {
    const tokenRecords = await this.db.query.contactsProviderTokens.findMany({
      where: and(
        eq(schema.contactsProviderTokens.userId, userId),
        eq(schema.contactsProviderTokens.isActive, true)
      ),
    });

    return tokenRecords.map((record) => ({
      id: record.id,
      provider: record.provider,
      email: record.email,
      tokenExpiresAt: record.tokenExpiresAt,
    }));
  }

  async listImportAccounts(
    userId: string,
    provider?: string
  ): Promise<
    Array<{
      id: string;
      provider: string;
      email: string | null;
      isPrimary: boolean;
      isActive: boolean;
      tokenExpiresAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    const conditions = [eq(schema.contactsProviderTokens.userId, userId)];
    if (provider) {
      conditions.push(eq(schema.contactsProviderTokens.provider, provider));
    }
    const rows = await this.db.query.contactsProviderTokens.findMany({
      where: and(...conditions),
      orderBy: [
        desc(schema.contactsProviderTokens.isActive),
        desc(schema.contactsProviderTokens.updatedAt),
      ],
    });
    return rows.map((r) => ({
      id: r.id,
      provider: r.provider,
      email: r.email,
      isPrimary: r.isPrimary,
      isActive: r.isActive,
      tokenExpiresAt: r.tokenExpiresAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async countActiveForProvider(
    userId: string,
    provider: string
  ): Promise<number> {
    const rows = await this.db.query.contactsProviderTokens.findMany({
      where: and(
        eq(schema.contactsProviderTokens.userId, userId),
        eq(schema.contactsProviderTokens.provider, provider),
        eq(schema.contactsProviderTokens.isActive, true)
      ),
      columns: { id: true },
    });
    return rows.length;
  }

  async hasActiveAccountForNormalizedEmail(
    userId: string,
    provider: string,
    normalizedEmail: string
  ): Promise<boolean> {
    if (!normalizedEmail) {
      return false;
    }
    const row = await this.findByUserProviderEmail(
      userId,
      provider,
      normalizedEmail,
      false
    );
    return !!row;
  }

  async assertTokenOwnedByUser(tokenId: string, userId: string): Promise<void> {
    const row = await this.getTokenRecord(tokenId);
    if (!row || row.userId !== userId) {
      throw new NotFoundException("Import account not found.");
    }
  }

  async getTokenRecord(tokenId: string): Promise<{
    id: string;
    userId: string;
    provider: string;
    email: string | null;
    isActive: boolean;
    tokenExpiresAt: Date | null;
    isPrimary: boolean;
  } | null> {
    const tokenRecord = await this.db.query.contactsProviderTokens.findFirst({
      where: eq(schema.contactsProviderTokens.id, tokenId),
    });

    if (!tokenRecord) {
      return null;
    }

    return {
      id: tokenRecord.id,
      userId: tokenRecord.userId,
      provider: tokenRecord.provider,
      email: tokenRecord.email,
      isActive: tokenRecord.isActive,
      tokenExpiresAt: tokenRecord.tokenExpiresAt,
      isPrimary: tokenRecord.isPrimary,
    };
  }

  /**
   * When legacy rows stored NULL/blank email, email-keyed lookup misses them.
   * If there is exactly one ambiguous target, or exactly one primary among several null-email actives, merge into that row instead of inserting a duplicate.
   */
  private pickSingletonOrPrimaryNullEmailRow(
    rows: (typeof schema.contactsProviderTokens.$inferSelect)[]
  ): typeof schema.contactsProviderTokens.$inferSelect | null {
    if (rows.length === 0) {
      return null;
    }
    if (rows.length === 1) {
      return rows[0];
    }
    const primaries = rows.filter((r) => r.isPrimary);
    if (primaries.length === 1) {
      return primaries[0];
    }
    return null;
  }

  private async resolveNullableEmailTokenRowForBackfill(
    userId: string,
    provider: string
  ): Promise<typeof schema.contactsProviderTokens.$inferSelect | null> {
    const nullEmailActives =
      await this.db.query.contactsProviderTokens.findMany({
        where: and(
          eq(schema.contactsProviderTokens.userId, userId),
          eq(schema.contactsProviderTokens.provider, provider),
          eq(schema.contactsProviderTokens.isActive, true),
          or(
            isNull(schema.contactsProviderTokens.email),
            sql`trim(coalesce(${schema.contactsProviderTokens.email}, '')) = ''`
          )
        ),
      });
    return this.pickSingletonOrPrimaryNullEmailRow(nullEmailActives);
  }

  private async mergeTokensIntoRecord(
    row: typeof schema.contactsProviderTokens.$inferSelect,
    tokens: ProviderTokens,
    normalizedEmail: string,
    userId: string,
    provider: string
  ): Promise<string> {
    await this.updateTokens(row.id, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.tokenExpiresAt,
      email: normalizedEmail,
    });
    if (!row.isActive) {
      await this.updateTokenActiveStatus(row.id, true);
    }
    if (tokens.isPrimary === true) {
      await this.clearPrimaryForProviderExcept(userId, provider, row.id);
      await this.setIsPrimary(row.id, true);
    }
    return row.id;
  }

  private async findByUserProviderEmail(
    userId: string,
    provider: string,
    normalizedEmail: string,
    includeInactive: boolean
  ): Promise<typeof schema.contactsProviderTokens.$inferSelect | null> {
    const activeCond = includeInactive
      ? undefined
      : eq(schema.contactsProviderTokens.isActive, true);
    const whereParts = [
      eq(schema.contactsProviderTokens.userId, userId),
      eq(schema.contactsProviderTokens.provider, provider),
      sql`lower(trim(${schema.contactsProviderTokens.email})) = ${normalizedEmail}`,
    ];
    if (activeCond) {
      whereParts.push(activeCond);
    }
    return this.db.query.contactsProviderTokens.findFirst({
      where: and(...whereParts),
    });
  }

  private async clearPrimaryForProviderExcept(
    userId: string,
    provider: string,
    exceptTokenId: string
  ): Promise<void> {
    const base = and(
      eq(schema.contactsProviderTokens.userId, userId),
      eq(schema.contactsProviderTokens.provider, provider)
    );
    await this.db
      .update(schema.contactsProviderTokens)
      .set({
        isPrimary: false,
        updatedAt: toUTC(),
      })
      .where(
        exceptTokenId
          ? and(base, ne(schema.contactsProviderTokens.id, exceptTokenId))
          : base
      );
  }

  private async setIsPrimary(
    tokenId: string,
    isPrimary: boolean
  ): Promise<void> {
    await this.db
      .update(schema.contactsProviderTokens)
      .set({ isPrimary, updatedAt: toUTC() })
      .where(eq(schema.contactsProviderTokens.id, tokenId));
  }
}
