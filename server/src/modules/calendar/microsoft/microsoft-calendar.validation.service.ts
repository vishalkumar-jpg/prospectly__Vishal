import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { dayjs, utcDayjs } from "utils/dayjs";
import { isIanaTimezone, resolveTimezoneForDayjs } from "utils/timezone.utils";
import { MICROSOFT_CALENDAR_MESSAGES } from "./microsoft-calendar.constants";

@Injectable()
export class MicrosoftCalendarValidationService {
  private readonly logger = new Logger(MicrosoftCalendarValidationService.name);

  validateConfig(
    clientId: string,
    clientSecret: string,
    isCallback = false
  ): void {
    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        isCallback
          ? MICROSOFT_CALENDAR_MESSAGES.ERROR.MICROSOFT_OAUTH_NOT_CONFIGURED
          : MICROSOFT_CALENDAR_MESSAGES.ERROR.MICROSOFT_SUPPORT_REQUIRED
      );
    }
  }

  async discoverUserEmail(tokens: AnyType): Promise<string | null> {
    let userEmail: string | null = null;

    // Method 0: Try to decode ID token
    if (tokens.id_token) {
      userEmail = this.extractEmailFromIdToken(tokens.id_token);
      if (userEmail) return userEmail;
    }

    // Method 1: Try /me endpoint
    userEmail = await this.fetchEmailFromMeEndpoint(tokens.access_token);
    if (userEmail) return userEmail;

    // Method 2: Try calendar events
    userEmail = await this.fetchEmailFromCalendarEvents(tokens.access_token);
    if (userEmail) return userEmail;

    // Method 3: Try mailbox settings
    userEmail = await this.fetchEmailFromMailboxSettings(tokens.access_token);
    if (userEmail) return userEmail;

    // Method 4: Try calendar list
    userEmail = await this.fetchEmailFromCalendarList(tokens.access_token);

    return userEmail;
  }

  private extractEmailFromIdToken(idToken: string): string | null {
    try {
      const parts = idToken.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64").toString("utf-8")
        );
        const email =
          payload.email || payload.preferred_username || payload.upn;
        if (email) {
          this.logger.log(
            `Successfully extracted email from ID token: ${email}`
          );
          return email;
        }
      }
    } catch (error) {
      this.logger.warn(
        `Error decoding ID token: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return null;
  }

  private async fetchEmailFromMeEndpoint(
    accessToken: string
  ): Promise<string | null> {
    try {
      const response = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        const email = data.mail || data.userPrincipalName;
        this.logger.log(
          `Successfully fetched email from /me endpoint: ${email}`
        );
        return email;
      }
      const errorText = await response.text();
      this.logger.warn(
        `Failed to fetch email from /me endpoint (${response.status}): ${errorText}`
      );
    } catch (error) {
      this.logger.warn(
        `Error fetching email from /me endpoint: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return null;
  }

  private async fetchEmailFromCalendarEvents(
    accessToken: string
  ): Promise<string | null> {
    try {
      const response = await fetch(
        "https://graph.microsoft.com/v1.0/me/calendar/events?$top=1&$select=organizer",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        if (
          data.value?.length > 0 &&
          data.value[0].organizer?.emailAddress?.address
        ) {
          const email = data.value[0].organizer.emailAddress.address;
          this.logger.log(
            `Successfully fetched email from calendar events: ${email}`
          );
          return email;
        }
      }
    } catch (error) {
      this.logger.warn(
        `Error fetching email from calendar events: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return null;
  }

  private async fetchEmailFromMailboxSettings(
    accessToken: string
  ): Promise<string | null> {
    try {
      const response = await fetch(
        "https://graph.microsoft.com/v1.0/me/mailboxSettings",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.userPrincipalName) {
          this.logger.log(
            `Successfully fetched email from mailbox settings: ${data.userPrincipalName}`
          );
          return data.userPrincipalName;
        }
      }
    } catch (error) {
      this.logger.warn(
        `Error fetching email from mailbox settings: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return null;
  }

  private async fetchEmailFromCalendarList(
    accessToken: string
  ): Promise<string | null> {
    try {
      const response = await fetch(
        "https://graph.microsoft.com/v1.0/me/calendars?$filter=isDefaultCalendar eq true",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (
          data.value?.length > 0 &&
          data.value[0].owner?.emailAddress?.address
        ) {
          const email = data.value[0].owner.emailAddress.address;
          this.logger.log(
            `Successfully fetched email from calendar list: ${email}`
          );
          return email;
        }
      }
    } catch (error) {
      this.logger.warn(
        `Error fetching email from calendar list: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return null;
  }

  async fetchMicrosoftUserTimezone(
    accessToken: string
  ): Promise<string | null> {
    try {
      const response = await fetch(
        "https://graph.microsoft.com/v1.0/me/mailboxSettings",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        return data.timeZone || null;
      }
    } catch (error) {
      this.logger.warn("Failed to fetch Microsoft user timezone:", error);
    }
    return null;
  }

  private isSlotBeyondWorkingHours(
    slotEnd: dayjs.Dayjs,
    endHour: number,
    slotTz: string
  ): boolean {
    const slotEndHm = slotEnd.tz(slotTz);
    return (
      slotEndHm.hour() > endHour ||
      (slotEndHm.hour() === endHour && slotEndHm.minute() > 0)
    );
  }

  private isSlotBusy(
    slotStart: dayjs.Dayjs,
    slotEnd: dayjs.Dayjs,
    busyPeriods: Array<{ start: Date; end: Date }>
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
    endHour: number,
    slotTz: string,
    nowDayjs: dayjs.Dayjs,
    busyPeriods: Array<{ start: Date; end: Date }>
  ): Array<{ start: string; end: string }> {
    const daySlots: Array<{ start: string; end: string }> = [];
    const startHour = 9;

    for (let hour = startHour; hour < endHour; hour++) {
      for (const minute of [0, 30]) {
        const slotStart = dayjs.tz(
          `${dateKey} ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`,
          slotTz
        );
        const slotEnd = slotStart.add(30, "minute");

        if (this.isSlotBeyondWorkingHours(slotEnd, endHour, slotTz)) {
          continue;
        }

        if (
          !this.isSlotBusy(slotStart, slotEnd, busyPeriods) &&
          slotStart.isAfter(nowDayjs)
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

  generateAvailableSlots(
    now: Date,
    days: number,
    busyPeriods: Array<{ start: Date; end: Date }>,
    userTimezone: string | null
  ): Array<{ start: string; end: string }> {
    const availableSlots: Array<{ start: string; end: string }> = [];
    const endHour = 17;
    const slotTz = isIanaTimezone(userTimezone)
      ? resolveTimezoneForDayjs(userTimezone!)
      : "UTC";
    const nowDayjs = utcDayjs(now);

    for (let i = 0; i < days; i++) {
      const cursor = nowDayjs
        .tz(slotTz)
        .startOf("day")
        .add(1 + i, "day");
      const dayOfWeek = cursor.day();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      const dateKey = cursor.format("YYYY-MM-DD");
      availableSlots.push(
        ...this.collectSlotsForDay(
          dateKey,
          endHour,
          slotTz,
          nowDayjs,
          busyPeriods
        )
      );
    }

    return availableSlots.filter(
      (slot, index, self) =>
        index === self.findIndex((s) => s.start === slot.start)
    );
  }
}
