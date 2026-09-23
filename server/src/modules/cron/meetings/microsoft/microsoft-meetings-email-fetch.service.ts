import { Injectable, Logger } from "@nestjs/common";
import { CalendarService } from "modules/calendar/calendar.service";
import { MICROSOFT_API_ENDPOINTS } from "../meetings.constants";

@Injectable()
export class MicrosoftMeetingsEmailFetchService {
  private readonly logger = new Logger(MicrosoftMeetingsEmailFetchService.name);

  constructor(private readonly calendarService: CalendarService) {}

  async fetchEmailFromAlternativeSources(
    accessToken: string,
    requesterId: string,
    integrationId: string
  ): Promise<string | null> {
    let userEmail: string | null = null;

    try {
      const calendarResponse = await fetch(
        `${MICROSOFT_API_ENDPOINTS.GRAPH_API_BASE}/me/calendar/events?$top=1&$select=organizer`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        if (
          calendarData.value?.length > 0 &&
          calendarData.value[0].organizer?.emailAddress?.address
        ) {
          userEmail = calendarData.value[0].organizer.emailAddress.address;
          this.logger.log(
            `[Microsoft Cron] Successfully fetched email from calendar events: ${userEmail}`
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `[Microsoft Cron] Error fetching email from calendar events: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    if (!userEmail) {
      userEmail = await this.tryMailboxSettings(accessToken);
    }

    if (!userEmail) {
      userEmail = await this.tryCalendarList(accessToken);
    }

    if (userEmail) {
      await this.calendarService.updateIntegrationEmail(
        requesterId,
        "microsoft",
        userEmail
      );
      this.logger.log(
        `[Microsoft Cron] Successfully saved email ${userEmail} to integration ${integrationId}`
      );
    }

    return userEmail;
  }

  private async tryMailboxSettings(
    accessToken: string
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `${MICROSOFT_API_ENDPOINTS.GRAPH_API_BASE}/me/mailboxSettings`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.userPrincipalName) {
          this.logger.log(
            `[Microsoft Cron] Successfully fetched email from mailbox settings: ${data.userPrincipalName}`
          );
          return data.userPrincipalName;
        }
      }
    } catch (error) {
      this.logger.warn(
        `[Microsoft Cron] Error fetching email from mailbox settings: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    return null;
  }

  private async tryCalendarList(accessToken: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${MICROSOFT_API_ENDPOINTS.GRAPH_API_BASE}/me/calendars?$filter=isDefaultCalendar eq true`,
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
            `[Microsoft Cron] Successfully fetched email from calendar list: ${email}`
          );
          return email;
        }
      }
    } catch (error) {
      this.logger.warn(
        `[Microsoft Cron] Error fetching email from calendar list: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    return null;
  }
}
