import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Auth, google } from "googleapis";
import * as schema from "database/schema";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { and, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CalendarTokenService } from "./shared/calendar-token.service";
import { ScheduledMeetingService } from "./shared/scheduled-meeting.service";
import { GoogleCalendarService } from "./google/google-calendar.service";
import { MicrosoftCalendarService } from "./microsoft/microsoft-calendar.service";
import {
  MicrosoftMeetingBookingService,
  BookMicrosoftTeamsMeetingInput,
  BookMicrosoftTeamsMeetingResult,
} from "./microsoft/microsoft-meeting-booking.service";
import { CalendarTokensDto } from "./calendar.dto";
import { CALENDAR_MESSAGES } from "./calendar.constants";
import { AvailableSlotsResult } from "./shared/base-calendar.service";
import { BusyPeriod } from "./shared/working-hours.util";

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly configService: ConfigService,
    private readonly tokenService: CalendarTokenService,
    private readonly scheduledMeetingService: ScheduledMeetingService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly microsoftCalendarService: MicrosoftCalendarService,
    private readonly microsoftMeetingBookingService: MicrosoftMeetingBookingService
  ) {
    // Google OAuth setup
    const clientId = this.configService.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.configService.get<string>("GOOGLE_CLIENT_SECRET");
    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:5000";
    const redirectUri =
      this.configService.get<string>("GOOGLE_REDIRECT_URI") ||
      `${frontendUrl}/calendar/callback`;

    if (clientId && clientSecret) {
      const _oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );
    } else {
      this.logger.warn(CALENDAR_MESSAGES.ERROR.GOOGLE_OAUTH_NOT_CONFIGURED);
    }

    // Microsoft OAuth setup
    const microsoftClientId =
      this.configService.get<string>("MICROSOFT_CLIENT_ID") || "";
    const microsoftClientSecret =
      this.configService.get<string>("MICROSOFT_CLIENT_SECRET") || "";
    const _microsoftRedirectUri =
      this.configService.get<string>("MICROSOFT_REDIRECT_URI") ||
      `${frontendUrl}/calendar/callback/microsoft`;

    if (!microsoftClientId || !microsoftClientSecret) {
      this.logger.warn(CALENDAR_MESSAGES.ERROR.MICROSOFT_OAUTH_NOT_CONFIGURED);
    }
  }

  async isCalendarConnected(
    userId: string,
    provider: string
  ): Promise<boolean> {
    const integration = await this.db.query.calendarIntegrations.findFirst({
      where: and(
        eq(schema.calendarIntegrations.userId, userId),
        eq(schema.calendarIntegrations.provider, provider),
        eq(schema.calendarIntegrations.isActive, true)
      ),
      columns: {
        id: true,
      },
    });

    return !!integration;
  }

  getAuthUrl(userId: string): string {
    return this.googleCalendarService.getAuthUrl(userId);
  }

  async handleCallback(
    code: string,
    userId: string
  ): Promise<{ tokens: Auth.Credentials; email: string | null }> {
    return this.googleCalendarService.handleCallback(code, userId);
  }

  async connectCalendarFromTokens(
    userId: string,
    tokens: CalendarTokensDto,
    email?: string | null
  ): Promise<{ success: boolean; email: string | null }> {
    return this.googleCalendarService.connectCalendarFromTokens(
      userId,
      tokens,
      email
    );
  }

  async createEvent(userId: string, event: AnyType): Promise<AnyType> {
    // Auto-detect provider from active integrations
    const provider = await this.detectProvider(userId);
    if (provider === "google") {
      return this.googleCalendarService.createEvent(userId, event);
    } else if (provider === "microsoft") {
      return this.microsoftCalendarService.createEvent(userId, event);
    }
    throw new Error(
      CALENDAR_MESSAGES.ERROR.NO_CALENDAR_INTEGRATION_FOUND(userId)
    );
  }

  async getAvailableSlots(
    userId: string,
    days = 7
  ): Promise<AvailableSlotsResult> {
    try {
      const integrations =
        await this.tokenService.getUserCalendarIntegrations(userId);

      if (!integrations || integrations.length === 0) {
        this.logger.warn(
          CALENDAR_MESSAGES.ERROR.NO_CALENDAR_INTEGRATION_FOUND(userId)
        );
        return { slots: [], timezone: null };
      }

      // Use the first active integration
      const activeIntegration = integrations.find((i) => i.isActive === true);
      if (!activeIntegration) {
        this.logger.warn(
          CALENDAR_MESSAGES.ERROR.NO_CALENDAR_INTEGRATION_FOUND(userId)
        );
        return { slots: [], timezone: null };
      }

      if (activeIntegration.provider === "google") {
        return this.googleCalendarService.getAvailableSlots(userId, days);
      } else if (activeIntegration.provider === "microsoft") {
        return this.microsoftCalendarService.getAvailableSlots(userId, days);
      }

      return { slots: [], timezone: null };
    } catch (error) {
      this.logger.error(
        CALENDAR_MESSAGES.ERROR.FAILED_TO_FETCH_AVAILABLE_SLOTS,
        error
      );
      throw error;
    }
  }

  /**
   * Provider-agnostic busy intervals for the next `days`, used to subtract real
   * calendar events from recruiter-defined working hours when generating slots.
   */
  async getBusyPeriods(userId: string, days = 7): Promise<BusyPeriod[]> {
    try {
      const integrations =
        await this.tokenService.getUserCalendarIntegrations(userId);
      const activeIntegration = integrations?.find((i) => i.isActive === true);
      if (!activeIntegration) return [];

      if (activeIntegration.provider === "google") {
        return this.googleCalendarService.getBusyPeriods(userId, days);
      } else if (activeIntegration.provider === "microsoft") {
        return this.microsoftCalendarService.getBusyPeriods(userId, days);
      }

      return [];
    } catch (error) {
      this.logger.error(
        CALENDAR_MESSAGES.ERROR.FAILED_TO_FETCH_AVAILABLE_SLOTS,
        error
      );
      // Fail closed: propagate so callers don't treat the recruiter as fully
      // available (which would expose busy slots and risk double-booking).
      throw error;
    }
  }

  async getUserCalendarTimezone(userId: string): Promise<string | null> {
    try {
      const integrations =
        await this.tokenService.getUserCalendarIntegrations(userId);
      const activeIntegration = integrations?.find((i) => i.isActive === true);
      if (!activeIntegration) return null;

      if (activeIntegration.provider === "google") {
        return this.googleCalendarService.getUserTimezone(userId);
      }
      if (activeIntegration.provider === "microsoft") {
        return this.microsoftCalendarService.getUserTimezone(userId);
      }
    } catch (error) {
      this.logger.warn(
        `CALENDAR_SERVICE :: getUserCalendarTimezone :: userId=${userId} :: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return null;
  }

  // Microsoft Calendar Methods (for backward compatibility)
  getMicrosoftAuthUrl(userId: string): string {
    return this.microsoftCalendarService.getAuthUrl(userId);
  }

  async handleMicrosoftCallback(
    code: string,
    userId: string
  ): Promise<{ tokens: AnyType; email: string | null }> {
    return this.microsoftCalendarService.handleCallback(code, userId);
  }

  async createMicrosoftCalendarEvent(
    userId: string,
    event: AnyType
  ): Promise<AnyType> {
    return this.microsoftCalendarService.createEvent(userId, event);
  }

  async getMicrosoftCalendarEvent(
    userId: string,
    eventId: string,
    select?: string
  ): Promise<AnyType | null> {
    return this.microsoftCalendarService.getEvent(userId, eventId, select);
  }

  async updateMicrosoftCalendarEvent(
    userId: string,
    eventId: string,
    patchBody: AnyType
  ): Promise<AnyType | null> {
    return this.microsoftCalendarService.updateEvent(
      userId,
      eventId,
      patchBody
    );
  }

  async createMicrosoftOnlineMeeting(
    userId: string,
    payload: {
      startDateTime: string;
      endDateTime: string;
      subject: string;
    }
  ): Promise<{ joinWebUrl?: string } | null> {
    return this.microsoftCalendarService.createOnlineMeeting(userId, payload);
  }

  async bookMicrosoftTeamsMeeting(
    userId: string,
    input: BookMicrosoftTeamsMeetingInput
  ): Promise<BookMicrosoftTeamsMeetingResult> {
    return this.microsoftMeetingBookingService.bookTeamsMeeting(userId, input);
  }

  // Token Management Methods (delegated to token service)
  async getUserCalendarIntegrations(
    userId: string
  ): Promise<schema.CalendarIntegration[]> {
    return this.tokenService.getUserCalendarIntegrations(userId);
  }

  /**
   * Get the active calendar integration for a user, if any exists.
   * Only one calendar provider can be active at a time per user.
   * @param userId - User ID
   * @returns The active calendar integration or null if none exists
   */
  async getActiveCalendarIntegration(
    userId: string
  ): Promise<schema.CalendarIntegration | null> {
    return this.tokenService.getActiveCalendarIntegration(userId);
  }

  async getGoogleTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken: string | null;
    expiryDate: number | undefined;
  } | null> {
    return this.tokenService.getTokens(userId, "google");
  }

  async getMicrosoftTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken: string | null;
    expiryDate: number | undefined;
  } | null> {
    return this.tokenService.getTokens(userId, "microsoft");
  }

  async saveGoogleTokens(userId: string, tokens: AnyType): Promise<void> {
    await this.tokenService.saveTokens(userId, "google", {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || null,
      expiryDate: tokens.expiryDate || null,
      email: tokens.email || null,
    });
  }

  async saveMicrosoftTokens(userId: string, tokens: AnyType): Promise<void> {
    await this.tokenService.saveTokens(userId, "microsoft", {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || null,
      expiryDate: tokens.expiryDate || null,
      email: tokens.email || null,
    });
  }

  async disconnectIntegration(
    userId: string,
    integrationId: string
  ): Promise<{ message: string }> {
    await this.tokenService.updateCalendarIntegrationStatus(
      userId,
      integrationId,
      false
    );
    return { message: CALENDAR_MESSAGES.INFO.INTEGRATION_DISCONNECTED };
  }

  async updateCalendarIntegrationStatus(
    userId: string,
    integrationId: string,
    isActive: boolean
  ): Promise<void> {
    await this.tokenService.updateCalendarIntegrationStatus(
      userId,
      integrationId,
      isActive
    );
  }

  async updateIntegrationEmail(
    userId: string,
    provider: "google" | "microsoft",
    email: string
  ): Promise<void> {
    await this.tokenService.updateIntegrationEmail(userId, provider, email);
  }

  // Scheduled Meeting Methods (delegated to scheduled meeting service)
  async createScheduledMeeting(data: {
    requesterId: string;
    introductionRequestId: string;
    prospectEmail: string;
    prospectName?: string;
    meetingDate: Date;
    meetingDuration?: number;
    meetingPlatform?: string;
    meetingLink?: string;
    calendarEventId?: string;
    calendarProvider?: string;
    metadata?: AnyType;
  }): Promise<schema.ScheduledMeeting> {
    return this.scheduledMeetingService.createScheduledMeeting(data);
  }

  async getScheduledMeetingByIntroductionRequestId(
    introductionRequestId: string
  ): Promise<schema.ScheduledMeeting | undefined> {
    return this.scheduledMeetingService.getScheduledMeetingByIntroductionRequestId(
      introductionRequestId
    );
  }

  async getScheduledMeetingsByStatusesAndProvider(
    statuses: string[],
    provider: string
  ): Promise<schema.ScheduledMeeting[]> {
    return this.scheduledMeetingService.getScheduledMeetingsByStatusesAndProvider(
      statuses,
      provider
    );
  }

  async updateScheduledMeeting(
    id: string,
    data: Partial<{
      meetingDate: Date;
      meetingDuration: number;
      meetingLink: string;
      calendarEventId: string;
      status: string;
      metadata: AnyType;
    }>
  ): Promise<void> {
    await this.scheduledMeetingService.updateScheduledMeeting(id, data);
  }

  async updateScheduledMeetingStatus(
    id: string,
    status: string
  ): Promise<void> {
    await this.scheduledMeetingService.updateScheduledMeetingStatus(id, status);
  }

  // Helper method to detect provider from active integrations
  private async detectProvider(
    userId: string
  ): Promise<"google" | "microsoft" | null> {
    const integrations =
      await this.tokenService.getUserCalendarIntegrations(userId);
    const activeIntegration = integrations.find((i) => i.isActive === true);
    return (activeIntegration?.provider as "google" | "microsoft") || null;
  }
}
