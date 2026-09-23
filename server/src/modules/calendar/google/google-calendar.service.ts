import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { google, Auth } from "googleapis";
import { dayjs, toUTC } from "utils/dayjs";
import { resolveTimezoneForDayjs } from "utils/timezone.utils";
import { oauthConfig } from "config/oauth.config";
import { ProfilesService } from "modules/profiles/profiles.service";
import { GOOGLE_CALENDAR_MESSAGES } from "./google-calendar.constants";
import { toUserFriendlyCalendarError } from "../shared/calendar-error.utils";
import {
  BaseCalendarService,
  AvailableSlotsResult,
} from "../shared/base-calendar.service";
import { BusyPeriod } from "../shared/working-hours.util";
import {
  CalendarTokenService,
  TokenData,
} from "../shared/calendar-token.service";
import { CalendarTokensDto } from "../calendar.dto";

@Injectable()
export class GoogleCalendarService extends BaseCalendarService {
  private oauth2Client: Auth.OAuth2Client | null = null;

  constructor(
    @Inject(CalendarTokenService)
    tokenService: CalendarTokenService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    private readonly profilesService: ProfilesService
  ) {
    super(tokenService, GoogleCalendarService.name);

    const { clientId } = oauthConfig.google;
    const { clientSecret } = oauthConfig.google;
    const { calendarRedirectUri } = oauthConfig.google;

    if (clientId && clientSecret) {
      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        calendarRedirectUri
      );
    }
  }

  getAuthUrl(userId: string): string {
    if (!this.oauth2Client) {
      throw new Error(
        GOOGLE_CALENDAR_MESSAGES.ERROR.GOOGLE_OAUTH_NOT_CONFIGURED
      );
    }
    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: oauthConfig.google.scopes,
      prompt: "consent",
      state: userId,
    });
  }

  async handleCallback(
    code: string,
    userId: string
  ): Promise<{ tokens: Auth.Credentials; email: string | null }> {
    if (!this.oauth2Client) {
      throw new Error(
        GOOGLE_CALENDAR_MESSAGES.ERROR.GOOGLE_OAUTH_NOT_CONFIGURED
      );
    }

    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error(
        GOOGLE_CALENDAR_MESSAGES.ERROR.FAILED_TO_OBTAIN_ACCESS_TOKEN
      );
    }

    let userEmail = null;
    try {
      const calendarListResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList/primary",
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        }
      );

      if (calendarListResponse.ok) {
        const calendarInfo = await calendarListResponse.json();
        userEmail = calendarInfo.id;
      } else {
        this.logger.warn(
          GOOGLE_CALENDAR_MESSAGES.ERROR.FAILED_TO_FETCH_CALENDAR_INFO(userId),
          await calendarListResponse.text()
        );
      }
    } catch (error) {
      this.logger.warn(
        GOOGLE_CALENDAR_MESSAGES.ERROR.FAILED_TO_FETCH_USER_EMAIL_API(userId),
        error
      );
    }

    await this.tokenService.saveTokens(userId, "google", {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiryDate: tokens.expiry_date || null,
      email: userEmail,
    });

    if (userEmail) {
      await this.updateProfileMeetingSettings(userId, userEmail);
    }

    return { tokens, email: userEmail };
  }

  async connectCalendarFromTokens(
    userId: string,
    tokens: CalendarTokensDto,
    email?: string | null
  ): Promise<{ success: boolean; email: string | null }> {
    if (!tokens.accessToken) {
      throw new Error(GOOGLE_CALENDAR_MESSAGES.ERROR.ACCESS_TOKEN_REQUIRED);
    }

    let userEmail = email || null;
    try {
      const calendarListResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList/primary",
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      if (calendarListResponse.ok) {
        const calendarInfo = await calendarListResponse.json();
        userEmail = calendarInfo.id;
        this.logger.log(
          GOOGLE_CALENDAR_MESSAGES.INFO.FETCHED_CALENDAR_EMAIL_FOR_USER(
            userId,
            userEmail
          )
        );
      } else {
        this.logger.warn(
          GOOGLE_CALENDAR_MESSAGES.ERROR.FAILED_TO_FETCH_CALENDAR_INFO(userId),
          await calendarListResponse.text()
        );
      }
    } catch (error) {
      this.logger.warn(
        GOOGLE_CALENDAR_MESSAGES.ERROR.FAILED_TO_FETCH_USER_EMAIL_API(userId),
        error
      );
    }

    await this.tokenService.saveTokens(userId, "google", {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || null,
      expiryDate: tokens.expiryDate || null,
      email: userEmail,
    });

    if (userEmail) {
      await this.updateProfileMeetingSettings(userId, userEmail);
    }

    this.logger.log(
      GOOGLE_CALENDAR_MESSAGES.INFO.CONNECTED_GOOGLE_CALENDAR(userId, userEmail)
    );

    return { success: true, email: userEmail };
  }

  async createEvent(userId: string, event: AnyType): Promise<AnyType> {
    let tokens = await this.tokenService.getTokens(userId, "google");

    if (!tokens) {
      throw new Error(
        GOOGLE_CALENDAR_MESSAGES.ERROR.GOOGLE_CALENDAR_NOT_CONNECTED
      );
    }

    if (this.isTokenExpiringSoon(tokens.expiryDate)) {
      tokens = await this.refreshToken(userId, tokens);
    }

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      this.logger.error(
        GOOGLE_CALENDAR_MESSAGES.ERROR.GOOGLE_API_ERROR,
        errorData
      );
      const rawMessage = errorData.error?.message || "";
      throw new Error(
        toUserFriendlyCalendarError(rawMessage, response.status, "Google")
      );
    }

    return await response.json();
  }

  async getAvailableSlots(
    userId: string,
    days = 7
  ): Promise<AvailableSlotsResult> {
    const tokens = await this.tokenService.getTokens(userId, "google");
    if (!tokens) return { slots: [], timezone: null };

    const now = dayjs();
    const endDate = dayjs().add(days, "day");

    const userTimezone = await this.fetchGoogleCalendarTimezone(
      tokens.accessToken
    );

    const workingHoursMap = await this.fetchGoogleWorkingLocationEvents(
      tokens.accessToken,
      now,
      endDate,
      userTimezone
    );

    const freebusyResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin: now.toISOString(),
          timeMax: endDate.toISOString(),
          items: [{ id: "primary" }],
        }),
      }
    );

    let busyPeriods: Array<{ start: dayjs.Dayjs; end: dayjs.Dayjs }> = [];
    if (freebusyResponse.ok) {
      const freebusyData = await freebusyResponse.json();
      const calendar = freebusyData.calendars?.primary;
      if (calendar?.busy) {
        busyPeriods = calendar.busy.map((period: AnyType) => ({
          start: dayjs(period.start),
          end: dayjs(period.end),
        }));
      }
    }

    const slots = this.generateAvailableSlots(
      now,
      days,
      busyPeriods,
      workingHoursMap,
      userTimezone
    );

    return { slots, timezone: userTimezone };
  }

  async getUserTimezone(userId: string): Promise<string | null> {
    const tokens = await this.tokenService.getTokens(userId, "google");
    if (!tokens) return null;
    return this.fetchGoogleCalendarTimezone(tokens.accessToken);
  }

  /**
   * Fetch the user's busy intervals from Google freeBusy for the next `days`.
   * Used to subtract real calendar events from recruiter-defined working hours.
   */
  async getBusyPeriods(userId: string, days = 7): Promise<BusyPeriod[]> {
    let tokens = await this.tokenService.getTokens(userId, "google");
    if (!tokens) return [];

    if (this.isTokenExpiringSoon(tokens.expiryDate)) {
      tokens = await this.refreshToken(userId, tokens);
    }

    const now = dayjs();
    const endDate = dayjs().add(days, "day");

    const freebusyResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin: now.toISOString(),
          timeMax: endDate.toISOString(),
          items: [{ id: "primary" }],
        }),
      }
    );

    if (!freebusyResponse.ok) {
      // Fail closed: a provider error must NOT make the recruiter look fully
      // free (that would expose busy slots and risk double-booking).
      const errorData = await freebusyResponse.json().catch(() => ({}));
      const rawMessage = errorData?.error?.message || "";
      throw new Error(
        toUserFriendlyCalendarError(
          rawMessage,
          freebusyResponse.status,
          "Google"
        )
      );
    }

    const freebusyData = await freebusyResponse.json();
    const calendar = freebusyData.calendars?.primary;
    if (!calendar?.busy) return [];

    return calendar.busy.map((period: AnyType) => ({
      start: dayjs(period.start),
      end: dayjs(period.end),
    }));
  }

  async refreshToken(userId: string, tokens: TokenData): Promise<TokenData> {
    const { clientId } = oauthConfig.google;
    const { clientSecret } = oauthConfig.google;

    if (!clientId || !clientSecret)
      throw new Error(
        GOOGLE_CALENDAR_MESSAGES.ERROR.GOOGLE_CREDENTIALS_NOT_CONFIGURED
      );

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokens.refreshToken || "",
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok)
      throw new Error(
        GOOGLE_CALENDAR_MESSAGES.ERROR.GOOGLE_TOKEN_REFRESH_FAILED
      );

    const newTokenData = await tokenResponse.json();
    const expiryDate = toUTC().valueOf() + newTokenData.expires_in * 1000;

    await this.tokenService.saveTokens(userId, "google", {
      accessToken: newTokenData.access_token,
      refreshToken: newTokenData.refresh_token || tokens.refreshToken || null,
      expiryDate,
    });

    return {
      accessToken: newTokenData.access_token,
      refreshToken: newTokenData.refresh_token || tokens.refreshToken || null,
      expiryDate,
    };
  }

  private async fetchGoogleWorkingLocationEvents(
    accessToken: string,
    timeMin: dayjs.Dayjs,
    timeMax: dayjs.Dayjs,
    calendarTimezone: string | null
  ): Promise<Map<string, { startHour: number; endHour: number }>> {
    const workingHoursMap = new Map<
      string,
      { startHour: number; endHour: number }
    >();
    const tz = calendarTimezone || "UTC";
    try {
      const eventsResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&eventTypes=workingLocation&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        for (const event of eventsData.items || []) {
          if (event.start?.dateTime && event.end?.dateTime) {
            const startDate = dayjs(event.start.dateTime).tz(tz);
            const endDate = dayjs(event.end.dateTime).tz(tz);
            const dateKey = startDate.format("YYYY-MM-DD");
            const startHour = startDate.hour();
            const endHour = endDate.hour();

            if (workingHoursMap.has(dateKey)) {
              const existing = workingHoursMap.get(dateKey)!;
              workingHoursMap.set(dateKey, {
                startHour: Math.min(existing.startHour, startHour),
                endHour: Math.max(existing.endHour, endHour),
              });
            } else {
              workingHoursMap.set(dateKey, { startHour, endHour });
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        GOOGLE_CALENDAR_MESSAGES.ERROR.FAILED_TO_FETCH_WORKING_LOCATION,
        error
      );
    }
    return workingHoursMap;
  }

  private async fetchGoogleCalendarTimezone(
    accessToken: string
  ): Promise<string | null> {
    try {
      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/settings/timezone",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const r = await response.json();
      this.logger.log("TEST FETCH GOOGLE CALENDAR TIMEZONE", {
        response: JSON.stringify(r),
      });

      if (response.ok) {
        const data = r;
        return data.value || null;
      } else {
        this.logger.warn(
          GOOGLE_CALENDAR_MESSAGES.ERROR.FAILED_TO_FETCH_TIMEZONE,
          await response.text()
        );
      }
    } catch (error) {
      this.logger.warn(
        GOOGLE_CALENDAR_MESSAGES.ERROR.FAILED_TO_FETCH_TIMEZONE,
        error
      );
    }
    return null;
  }

  private isSlotBeyondWorkingHours(
    slotEnd: dayjs.Dayjs,
    workingHours: { startHour: number; endHour: number },
    tz: string
  ): boolean {
    const slotEndHm = slotEnd.tz(tz);
    const slotEndHour = slotEndHm.hour();
    const slotEndMinute = slotEndHm.minute();
    return (
      slotEndHour > workingHours.endHour ||
      (slotEndHour === workingHours.endHour && slotEndMinute > 0)
    );
  }

  private isSlotBusy(
    slotStart: dayjs.Dayjs,
    slotEnd: dayjs.Dayjs,
    busyPeriods: Array<{ start: dayjs.Dayjs; end: dayjs.Dayjs }>
  ): boolean {
    return busyPeriods.some(
      (busy) =>
        (slotStart.isSameOrAfter(busy.start) && slotStart.isBefore(busy.end)) ||
        (slotEnd.isAfter(busy.start) && slotEnd.isSameOrBefore(busy.end)) ||
        (slotStart.isSameOrBefore(busy.start) &&
          slotEnd.isSameOrAfter(busy.end))
    );
  }

  private collectSlotsForDay(
    dateKey: string,
    workingHours: { startHour: number; endHour: number },
    tz: string,
    now: dayjs.Dayjs,
    busyPeriods: Array<{ start: dayjs.Dayjs; end: dayjs.Dayjs }>
  ): Array<{ start: string; end: string }> {
    const daySlots: Array<{ start: string; end: string }> = [];

    for (
      let hour = workingHours.startHour;
      hour < workingHours.endHour;
      hour++
    ) {
      for (const minute of [0, 30]) {
        const slotStart = dayjs.tz(
          `${dateKey} ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`,
          tz
        );
        const slotEnd = slotStart.add(30, "minute");

        if (this.isSlotBeyondWorkingHours(slotEnd, workingHours, tz)) {
          continue;
        }

        if (
          !this.isSlotBusy(slotStart, slotEnd, busyPeriods) &&
          slotStart.isAfter(now)
        ) {
          daySlots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
          });
        }
      }
    }

    return daySlots;
  }

  private generateAvailableSlots(
    now: dayjs.Dayjs,
    days: number,
    busyPeriods: Array<{ start: dayjs.Dayjs; end: dayjs.Dayjs }>,
    workingHoursMap: Map<string, { startHour: number; endHour: number }>,
    userTimezone: string | null
  ): Array<{ start: string; end: string }> {
    const availableSlots: Array<{ start: string; end: string }> = [];
    const defaultWorkingHours = { startHour: 9, endHour: 17 };
    const tz = resolveTimezoneForDayjs(userTimezone || "UTC");

    for (let i = 0; i < days; i++) {
      const cursor = now
        .tz(tz)
        .startOf("day")
        .add(1 + i, "day");
      const dayOfWeek = cursor.day();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      const dateKey = cursor.format("YYYY-MM-DD");
      const workingHours = workingHoursMap.get(dateKey) || defaultWorkingHours;
      availableSlots.push(
        ...this.collectSlotsForDay(dateKey, workingHours, tz, now, busyPeriods)
      );
    }

    return availableSlots.filter(
      (slot, index, self) =>
        index === self.findIndex((s) => s.start === slot.start)
    );
  }

  private async updateProfileMeetingSettings(
    userId: string,
    email: string
  ): Promise<void> {
    try {
      await this.profilesService.updateProfile(userId, {
        meetingPlatform: "google_calendar" as AnyType,
        meetingUrl:
          `https://calendar.google.com/calendar/u/${email}` as AnyType,
      });
    } catch (error) {
      this.logger.warn(`Failed to update profile for user ${userId}:`, error);
    }
  }
}
