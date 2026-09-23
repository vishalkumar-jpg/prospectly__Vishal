import { Injectable, Logger, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { CalendarTokenService } from "modules/calendar/shared/calendar-token.service";
import { GoogleCalendarService } from "modules/calendar/google/google-calendar.service";
import { MicrosoftCalendarService } from "modules/calendar/microsoft/microsoft-calendar.service";
import { utcDayjs } from "utils/dayjs";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

@Injectable()
export class CalendarTokenCronService {
  private readonly logger = new Logger(CalendarTokenCronService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly tokenService: CalendarTokenService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly microsoftCalendarService: MicrosoftCalendarService
  ) {}

  /**
   * Refresh calendar tokens that are expiring soon.
   * Runs periodically to proactively refresh tokens before they expire.
   */
  async refreshExpiringTokens(): Promise<void> {
    this.logger.log("Starting calendar token refresh job...");

    try {
      // Get all active calendar integrations with refresh tokens
      const integrations = await this.db.query.calendarIntegrations.findMany({
        where: and(
          eq(schema.calendarIntegrations.isActive, true),
          isNotNull(schema.calendarIntegrations.refreshToken)
        ),
      });

      if (integrations.length === 0) {
        this.logger.log("No active calendar integrations found to refresh");
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

      for (const integration of integrations) {
        try {
          // Skip if token doesn't expire soon
          if (
            integration.tokenExpiresAt &&
            utcDayjs(integration.tokenExpiresAt).isAfter(expiryThreshold)
          ) {
            refreshResults.skipped++;
            continue;
          }

          // Get decrypted tokens
          const tokens = await this.tokenService.getTokens(
            integration.userId,
            integration.provider as "google" | "microsoft"
          );

          if (!tokens || !tokens.refreshToken) {
            this.logger.warn(
              `No refresh token available for integration ${integration.id}`
            );
            refreshResults.skipped++;
            continue;
          }

          // Refresh token based on provider
          if (integration.provider === "google") {
            await this.googleCalendarService.refreshToken(
              integration.userId,
              tokens
            );
          } else if (integration.provider === "microsoft") {
            await this.microsoftCalendarService.refreshToken(
              integration.userId,
              tokens
            );
          } else {
            this.logger.warn(
              `Unsupported provider: ${integration.provider} for integration ${integration.id}`
            );
            refreshResults.skipped++;
            continue;
          }

          refreshResults.success++;
        } catch {
          refreshResults.failed++;
          this.logger.error(
            `Failed to refresh token for integration ${integration.id}`
          );
          // Continue processing other integrations even if one fails
        }
      }

      this.logger.log(
        `Calendar token refresh job completed. Success: ${refreshResults.success}, Failed: ${refreshResults.failed}, Skipped: ${refreshResults.skipped}`
      );
    } catch (error) {
      this.logger.error(
        `Error during calendar token refresh cron: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
