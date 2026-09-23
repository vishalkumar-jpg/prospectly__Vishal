import { Injectable, Inject } from "@nestjs/common";
import { oauthConfig } from "config/oauth.config";
import { dayjs, toUTC } from "utils/dayjs";
import { MicrosoftCalendarValidationService } from "./microsoft-calendar.validation.service";
import {
  microsoftGraphReadHeaders,
  parseCalendarDateTimeToUtc,
} from "./microsoft-graph-datetime.utils";
import { MICROSOFT_CALENDAR_MESSAGES } from "./microsoft-calendar.constants";
import { toUserFriendlyCalendarError } from "../shared/calendar-error.utils";
import { BusyPeriod } from "../shared/working-hours.util";
import {
  BaseCalendarService,
  AvailableSlotsResult,
} from "../shared/base-calendar.service";
import {
  CalendarTokenService,
  TokenData,
} from "../shared/calendar-token.service";

@Injectable()
export class MicrosoftCalendarService extends BaseCalendarService {
  private readonly microsoftClientId: string;
  private readonly microsoftClientSecret: string;
  private readonly microsoftRedirectUri: string;

  constructor(
    @Inject(CalendarTokenService)
    tokenService: CalendarTokenService,
    private readonly validationService: MicrosoftCalendarValidationService
  ) {
    super(tokenService, MicrosoftCalendarService.name);

    this.microsoftClientId = oauthConfig.microsoft.clientId;
    this.microsoftClientSecret = oauthConfig.microsoft.clientSecret;
    this.microsoftRedirectUri = oauthConfig.microsoft.calendarRedirectUri;
  }

  getAuthUrl(userId: string): string {
    this.validationService.validateConfig(
      this.microsoftClientId,
      this.microsoftClientSecret
    );

    // Use scopes from config, ensuring User.Read is included for email access
    const scopeList = oauthConfig.microsoft.scopes || [
      "openid",
      "profile",
      "offline_access",
      "User.Read",
      "Calendars.Read",
      "Calendars.ReadWrite",
      "OnlineMeetings.ReadWrite",
      "OnlineMeetingArtifact.Read.All",
    ];
    const scope = scopeList.join(" ");
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${this.microsoftClientId}&response_type=code&redirect_uri=${encodeURIComponent(this.microsoftRedirectUri)}&scope=${encodeURIComponent(scope)}&state=${userId}&prompt=consent`;
  }

  async handleCallback(
    code: string,
    userId: string
  ): Promise<{ tokens: AnyType; email: string | null }> {
    this.validationService.validateConfig(
      this.microsoftClientId,
      this.microsoftClientSecret,
      true
    );

    const tokenResponse = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.microsoftClientId,
          client_secret: this.microsoftClientSecret,
          code,
          redirect_uri: this.microsoftRedirectUri,
          grant_type: "authorization_code",
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(
        `${MICROSOFT_CALENDAR_MESSAGES.ERROR.MICROSOFT_TOKEN_EXCHANGE_FAILED}: ${errorText}`
      );
    }

    const tokens = await tokenResponse.json();
    const userEmail = await this.validationService.discoverUserEmail(tokens);

    // If we still don't have email, this is a critical issue
    if (!userEmail) {
      this.logger.error(
        `CRITICAL: Could not fetch email for Microsoft calendar integration (user: ${userId}). The integration may not work properly without email.`
      );
      // Still save the integration, but log the error
      // The cron job will try to fetch email later
    } else {
      this.logger.log(
        `Successfully obtained email for Microsoft calendar integration: ${userEmail}`
      );
    }

    await this.tokenService.saveTokens(userId, "microsoft", {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiryDate: toUTC().valueOf() + tokens.expires_in * 1000,
      email: userEmail,
    });

    return { tokens, email: userEmail };
  }

  private getOutlookTimezoneFromPayload(payload: AnyType): string | null {
    return payload?.start?.timeZone?.trim() || null;
  }

  private buildGraphEventHeaders(
    accessToken: string,
    outlookTimeZone?: string | null
  ): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    if (outlookTimeZone) {
      headers.Prefer = `outlook.timezone="${outlookTimeZone}"`;
    }
    return headers;
  }

  async createEvent(userId: string, event: AnyType): Promise<AnyType> {
    let tokens = await this.tokenService.getTokens(userId, "microsoft");
    if (!tokens)
      throw new Error(
        MICROSOFT_CALENDAR_MESSAGES.ERROR.MICROSOFT_CALENDAR_NOT_CONNECTED
      );

    if (this.isTokenExpiringSoon(tokens.expiryDate)) {
      tokens = await this.refreshToken(userId, tokens);
    }

    const response = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method: "POST",
      headers: this.buildGraphEventHeaders(
        tokens.accessToken,
        this.getOutlookTimezoneFromPayload(event)
      ),
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const rawMessage = errorData.error?.message || "";
      this.logger.error(
        MICROSOFT_CALENDAR_MESSAGES.ERROR.MICROSOFT_GRAPH_API_ERROR,
        errorData
      );
      throw new Error(
        toUserFriendlyCalendarError(rawMessage, response.status, "Microsoft")
      );
    }

    return await response.json();
  }

  async updateEvent(
    userId: string,
    eventId: string,
    patchBody: AnyType
  ): Promise<AnyType | null> {
    let tokens = await this.tokenService.getTokens(userId, "microsoft");
    if (!tokens) return null;

    if (this.isTokenExpiringSoon(tokens.expiryDate)) {
      tokens = await this.refreshToken(userId, tokens);
    }

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
      {
        method: "PATCH",
        headers: this.buildGraphEventHeaders(
          tokens.accessToken,
          this.getOutlookTimezoneFromPayload(patchBody)
        ),
        body: JSON.stringify(patchBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      this.logger.warn(
        `Microsoft event PATCH failed: ${errorData.error?.message || "Unknown error"}`
      );
      return null;
    }

    return await response.json();
  }

  async createOnlineMeeting(
    userId: string,
    payload: {
      startDateTime: string;
      endDateTime: string;
      subject: string;
    }
  ): Promise<{ joinWebUrl?: string } | null> {
    let tokens = await this.tokenService.getTokens(userId, "microsoft");
    if (!tokens) return null;

    if (this.isTokenExpiringSoon(tokens.expiryDate)) {
      tokens = await this.refreshToken(userId, tokens);
    }

    const body = {
      startDateTime: payload.startDateTime,
      endDateTime: payload.endDateTime,
      subject: payload.subject,
    };

    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/onlineMeetings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      this.logger.warn(
        `Microsoft OnlineMeetings API failed: ${errorData.error?.message || "Unknown error"}`
      );
      return null;
    }

    return await response.json();
  }

  async getEvent(
    userId: string,
    eventId: string,
    select?: string
  ): Promise<AnyType | null> {
    let tokens = await this.tokenService.getTokens(userId, "microsoft");
    if (!tokens) return null;

    if (this.isTokenExpiringSoon(tokens.expiryDate)) {
      tokens = await this.refreshToken(userId, tokens);
    }

    const selectParam = select ? `?$select=${encodeURIComponent(select)}` : "";
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/events/${eventId}${selectParam}`,
      {
        headers: microsoftGraphReadHeaders(tokens.accessToken),
      }
    );

    if (!response.ok) return null;
    return await response.json();
  }

  async getAvailableSlots(
    userId: string,
    days = 7
  ): Promise<AvailableSlotsResult> {
    const tokens = await this.tokenService.getTokens(userId, "microsoft");
    if (!tokens) return { slots: [], timezone: null };

    const now = toUTC();
    const endDate = toUTC();
    endDate.setDate(endDate.getDate() + days);

    // Fetch user's timezone from Microsoft Graph API
    const userTimezone =
      await this.validationService.fetchMicrosoftUserTimezone(
        tokens.accessToken
      );

    const calendarResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${endDate.toISOString()}`,
      {
        headers: microsoftGraphReadHeaders(tokens.accessToken),
      }
    );

    let busyPeriods: Array<{ start: Date; end: Date }> = [];
    if (calendarResponse.ok) {
      const calendarData = await calendarResponse.json();
      if (calendarData.value) {
        busyPeriods = calendarData.value
          .map((event: AnyType) => {
            const start = parseCalendarDateTimeToUtc(event.start);
            const end = parseCalendarDateTimeToUtc(event.end);
            if (!start || !end) return null;
            return { start, end };
          })
          .filter(Boolean) as Array<{ start: Date; end: Date }>;
      }
    }

    const slots = this.validationService.generateAvailableSlots(
      now,
      days,
      busyPeriods,
      userTimezone
    );
    return { slots, timezone: userTimezone };
  }

  /**
   * Fetch the user's busy intervals from Microsoft Graph calendarView for the
   * next `days`. Used to subtract real calendar events from working hours.
   */
  async getBusyPeriods(userId: string, days = 7): Promise<BusyPeriod[]> {
    let tokens = await this.tokenService.getTokens(userId, "microsoft");
    if (!tokens) return [];

    if (this.isTokenExpiringSoon(tokens.expiryDate)) {
      tokens = await this.refreshToken(userId, tokens);
    }

    const now = toUTC();
    const endDate = toUTC();
    endDate.setDate(endDate.getDate() + days);

    const calendarResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${endDate.toISOString()}`,
      {
        headers: microsoftGraphReadHeaders(tokens.accessToken),
      }
    );

    if (!calendarResponse.ok) {
      // Fail closed: a provider error must NOT make the recruiter look fully
      // free (that would expose busy slots and risk double-booking).
      const errorData = await calendarResponse.json().catch(() => ({}));
      const rawMessage = errorData?.error?.message || "";
      throw new Error(
        toUserFriendlyCalendarError(
          rawMessage,
          calendarResponse.status,
          "Microsoft"
        )
      );
    }

    const calendarData = await calendarResponse.json();
    if (!calendarData.value) return [];

    return calendarData.value
      .map((event: AnyType) => {
        const start = parseCalendarDateTimeToUtc(event.start);
        const end = parseCalendarDateTimeToUtc(event.end);
        if (!start || !end) return null;
        return { start: dayjs(start), end: dayjs(end) };
      })
      .filter(Boolean) as BusyPeriod[];
  }

  async getUserTimezone(userId: string): Promise<string | null> {
    let tokens = await this.tokenService.getTokens(userId, "microsoft");
    if (!tokens) return null;
    if (this.isTokenExpiringSoon(tokens.expiryDate)) {
      tokens = await this.refreshToken(userId, tokens);
    }
    return this.validationService.fetchMicrosoftUserTimezone(
      tokens.accessToken
    );
  }

  async refreshToken(userId: string, tokens: TokenData): Promise<TokenData> {
    const tokenResponse = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.microsoftClientId,
          client_secret: this.microsoftClientSecret,
          refresh_token: tokens.refreshToken || "",
          grant_type: "refresh_token",
        }),
      }
    );

    if (!tokenResponse.ok)
      throw new Error(
        MICROSOFT_CALENDAR_MESSAGES.ERROR.MICROSOFT_TOKEN_REFRESH_FAILED
      );

    const newTokenData = await tokenResponse.json();
    const expiryDate = toUTC().valueOf() + newTokenData.expires_in * 1000;

    // Get existing integration to preserve email
    const existingIntegration =
      await this.tokenService.getActiveCalendarIntegration(userId);
    const existingEmail =
      existingIntegration?.provider === "microsoft"
        ? existingIntegration.email
        : null;

    // Try to fetch email if missing
    let userEmail = existingEmail;
    if (!userEmail) {
      userEmail = await this.validationService.discoverUserEmail(newTokenData);
    }

    await this.tokenService.saveTokens(userId, "microsoft", {
      accessToken: newTokenData.access_token,
      refreshToken: newTokenData.refresh_token || tokens.refreshToken || null,
      expiryDate,
      email: userEmail,
    });

    return {
      accessToken: newTokenData.access_token,
      refreshToken: newTokenData.refresh_token || tokens.refreshToken || null,
      expiryDate,
    };
  }
}
