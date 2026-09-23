import { Injectable, Logger, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { ContactsProviderTokensService } from "modules/contact-queue/contacts-provider-tokens.service";
import { refreshGoogleToken } from "services/google-calendar.service";
import { refreshMicrosoftToken } from "services/microsoft-calendar.service";
import { toUTC, utcDayjs } from "utils/dayjs";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

@Injectable()
export class ContactsTokenCronService {
  private readonly logger = new Logger(ContactsTokenCronService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly contactsProviderTokensService: ContactsProviderTokensService
  ) {}

  /**
   * Refresh contacts provider tokens that are expiring soon.
   * Runs periodically to proactively refresh tokens before they expire.
   * Note: Apple tokens don't need refresh as they use app-specific passwords.
   */
  async refreshExpiringTokens(): Promise<void> {
    this.logger.log("Starting contacts provider token refresh job...");

    try {
      // Get all active contacts provider tokens with refresh tokens
      // Exclude Apple as it doesn't use OAuth tokens
      const tokenRecords = await this.db.query.contactsProviderTokens.findMany({
        where: and(
          eq(schema.contactsProviderTokens.isActive, true),
          isNotNull(schema.contactsProviderTokens.refreshToken)
        ),
      });

      // Filter out Apple tokens (they don't need refresh)
      const tokensToRefresh = tokenRecords.filter(
        (record) => record.provider !== "apple"
      );

      if (tokensToRefresh.length === 0) {
        this.logger.log("No active contacts provider tokens found to refresh");
        return;
      }

      const refreshResults = {
        success: 0,
        failed: 0,
        skipped: 0,
      };

      const now = utcDayjs();
      // Refresh tokens that expire within the next 30 minutes (buffer time)
      const bufferMinutes = 30;
      const expiryThreshold = now.add(bufferMinutes, "minute");

      for (const tokenRecord of tokensToRefresh) {
        try {
          // Skip if token doesn't expire soon
          if (
            tokenRecord.tokenExpiresAt &&
            utcDayjs(tokenRecord.tokenExpiresAt).isAfter(expiryThreshold)
          ) {
            refreshResults.skipped++;
            continue;
          }

          // Get decrypted tokens
          const tokens = await this.contactsProviderTokensService.getTokens(
            tokenRecord.userId,
            tokenRecord.provider
          );

          if (!tokens || !tokens.refreshToken) {
            this.logger.warn(
              `No refresh token available for token record ${tokenRecord.id} (provider: ${tokenRecord.provider})`
            );
            refreshResults.skipped++;
            continue;
          }

          // Refresh token based on provider
          let refreshedTokens: {
            access_token: string;
            refresh_token?: string;
            expiry_date?: number;
          } | null = null;

          if (tokenRecord.provider === "google") {
            refreshedTokens = await refreshGoogleToken(tokens.refreshToken);
          } else if (tokenRecord.provider === "microsoft") {
            refreshedTokens = await refreshMicrosoftToken(tokens.refreshToken);
          } else {
            this.logger.warn(
              `Unsupported provider: ${tokenRecord.provider} for token record ${tokenRecord.id}`
            );
            refreshResults.skipped++;
            continue;
          }

          if (!refreshedTokens || !refreshedTokens.access_token) {
            throw new Error("Token refresh did not return access token");
          }

          // Update tokens in database
          await this.contactsProviderTokensService.updateTokens(
            tokenRecord.id,
            {
              accessToken: refreshedTokens.access_token,
              refreshToken:
                refreshedTokens.refresh_token || tokens.refreshToken || null,
              tokenExpiresAt: refreshedTokens.expiry_date
                ? toUTC(refreshedTokens.expiry_date)
                : undefined,
            }
          );

          refreshResults.success++;
        } catch (error) {
          refreshResults.failed++;
          this.logger.error(
            `Failed to refresh token for token record ${tokenRecord.id}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );

          // Mark token as inactive if refresh fails (similar to queue processors)
          try {
            await this.contactsProviderTokensService.deactivateTokenById(
              tokenRecord.id
            );
          } catch (deactivateError) {
            this.logger.error(
              `Failed to deactivate token record ${tokenRecord.id}: ${
                deactivateError instanceof Error
                  ? deactivateError.message
                  : String(deactivateError)
              }`
            );
          }

          // Continue processing other tokens even if one fails
        }
      }

      this.logger.log(
        `Contacts provider token refresh job completed. Success: ${refreshResults.success}, Failed: ${refreshResults.failed}, Skipped: ${refreshResults.skipped}`
      );
    } catch (error) {
      this.logger.error(
        `Error during contacts provider token refresh cron: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
