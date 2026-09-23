import { Injectable, Inject, Logger } from "@nestjs/common";
import { EncryptionService } from "shared/encryption.service";
import * as schema from "database/schema";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { and, eq, desc } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface TokenData {
  accessToken: string;
  refreshToken: string | null;
  expiryDate: number | undefined;
}

@Injectable()
export class CalendarTokenService {
  private readonly logger = new Logger(CalendarTokenService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly encryptionService: EncryptionService
  ) {}

  /**
   * Get the active calendar integration for a user, if any exists.
   * Only one calendar provider can be active at a time per user.
   * @param userId - User ID
   * @returns The active calendar integration or null if none exists
   */
  async getActiveCalendarIntegration(
    userId: string
  ): Promise<schema.CalendarIntegration | null> {
    const integrations = await this.getUserCalendarIntegrations(userId);
    return integrations.find((i) => i.isActive === true) || null;
  }

  async saveTokens(
    userId: string,
    provider: "google" | "microsoft",
    tokens: {
      accessToken: string;
      refreshToken?: string | null;
      expiryDate?: number | null;
      email?: string | null;
    }
  ): Promise<void> {
    const encryptedAccessToken = this.encryptionService.encryptContactData(
      tokens.accessToken
    );
    const encryptedRefreshToken = tokens.refreshToken
      ? this.encryptionService.encryptContactData(tokens.refreshToken)
      : null;

    const tokenExpiresAt = tokens.expiryDate ? toUTC(tokens.expiryDate) : null;

    const existing = await this.db.query.calendarIntegrations.findFirst({
      where: and(
        eq(schema.calendarIntegrations.userId, userId),
        eq(schema.calendarIntegrations.provider, provider)
      ),
    });

    // Enforce single active calendar rule: deactivate all other calendar integrations
    // before activating this one. This ensures only one calendar provider is active at a time.
    const allIntegrations = await this.getUserCalendarIntegrations(userId);
    const otherActiveIntegrations = allIntegrations.filter(
      (i) => i.isActive === true && i.provider !== provider
    );

    if (otherActiveIntegrations.length > 0) {
      for (const integration of otherActiveIntegrations) {
        await this.db
          .update(schema.calendarIntegrations)
          .set({
            isActive: false,
            updatedAt: toUTC(),
          })
          .where(eq(schema.calendarIntegrations.id, integration.id));
      }
      this.logger.log(
        `Deactivated ${otherActiveIntegrations.length} other calendar integration(s) for user ${userId} before activating ${provider}`
      );
    }

    if (existing) {
      await this.db
        .update(schema.calendarIntegrations)
        .set({
          email: tokens.email || existing.email,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt,
          isActive: true,
          updatedAt: toUTC(),
        })
        .where(eq(schema.calendarIntegrations.id, existing.id));
    } else {
      await this.db.insert(schema.calendarIntegrations).values({
        userId,
        provider,
        email: tokens.email,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
        isActive: true,
      });
    }
  }

  async getTokens(
    userId: string,
    provider: "google" | "microsoft"
  ): Promise<TokenData | null> {
    const integration = await this.db.query.calendarIntegrations.findFirst({
      where: and(
        eq(schema.calendarIntegrations.userId, userId),
        eq(schema.calendarIntegrations.provider, provider),
        eq(schema.calendarIntegrations.isActive, true)
      ),
    });

    if (!integration) return null;

    try {
      const decryptedAccessToken =
        await this.encryptionService.decryptContactData(
          integration.accessToken
        );
      const decryptedRefreshToken = integration.refreshToken
        ? await this.encryptionService.decryptContactData(
            integration.refreshToken
          )
        : null;

      if (!decryptedAccessToken)
        throw new Error("Failed to decrypt access token");

      return {
        accessToken: decryptedAccessToken,
        refreshToken: decryptedRefreshToken,
        expiryDate: integration.tokenExpiresAt?.getTime(),
      };
    } catch {
      throw new Error(
        "Unable to decrypt calendar tokens. Please reconnect your calendar."
      );
    }
  }

  async getUserCalendarIntegrations(
    userId: string
  ): Promise<schema.CalendarIntegration[]> {
    return this.db.query.calendarIntegrations.findMany({
      where: eq(schema.calendarIntegrations.userId, userId),
      orderBy: desc(schema.calendarIntegrations.createdAt),
    });
  }

  async updateCalendarIntegrationStatus(
    userId: string,
    integrationId: string,
    isActive: boolean
  ): Promise<void> {
    await this.db
      .update(schema.calendarIntegrations)
      .set({
        isActive,
        updatedAt: toUTC(),
      })
      .where(
        and(
          eq(schema.calendarIntegrations.id, integrationId),
          eq(schema.calendarIntegrations.userId, userId)
        )
      );
  }

  /**
   * Update email for a calendar integration.
   * @param userId - User ID
   * @param provider - Calendar provider
   * @param email - Email address to update
   */
  async updateIntegrationEmail(
    userId: string,
    provider: "google" | "microsoft",
    email: string
  ): Promise<void> {
    const existing = await this.db.query.calendarIntegrations.findFirst({
      where: and(
        eq(schema.calendarIntegrations.userId, userId),
        eq(schema.calendarIntegrations.provider, provider)
      ),
    });

    if (existing) {
      await this.db
        .update(schema.calendarIntegrations)
        .set({
          email,
          updatedAt: toUTC(),
        })
        .where(eq(schema.calendarIntegrations.id, existing.id));
      this.logger.log(
        `Updated email for ${provider} integration ${existing.id} (user: ${userId})`
      );
    }
  }
}
