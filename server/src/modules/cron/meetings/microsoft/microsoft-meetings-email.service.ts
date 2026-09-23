import { Injectable, Logger } from "@nestjs/common";
import { CalendarService } from "modules/calendar/calendar.service";
import { isPersonalMicrosoftAccount } from "modules/calendar/microsoft/microsoft-account.utils";
import type { CalendarIntegration } from "database/schema";
import type { ScheduledMeeting } from "database/schema";
import { MicrosoftMeetingsTokenService } from "./microsoft-meetings-token.service";
import { MicrosoftMeetingsEmailFetchService } from "./microsoft-meetings-email-fetch.service";
import { MICROSOFT_API_ENDPOINTS } from "../meetings.constants";

export interface AccountTypeResult {
  userEmail: string | null;
  isPersonalAccount: boolean;
}

@Injectable()
export class MicrosoftMeetingsEmailService {
  private readonly logger = new Logger(MicrosoftMeetingsEmailService.name);

  constructor(
    private readonly calendarService: CalendarService,
    private readonly tokenService: MicrosoftMeetingsTokenService,
    private readonly emailFetchService: MicrosoftMeetingsEmailFetchService
  ) {}

  async determineAccountTypeAndEmail(
    integration: CalendarIntegration,
    meeting: ScheduledMeeting
  ): Promise<AccountTypeResult> {
    let userEmail = integration.email;
    let accountTypeDetermined = false;
    let isPersonalAccount = false;

    if (!userEmail) {
      this.logger.warn(
        `[Microsoft Cron] Email missing for integration ${integration.id}, attempting to fetch from Microsoft Graph API`
      );

      const tokens = await this.calendarService.getMicrosoftTokens(
        meeting.requesterId
      );
      if (tokens) {
        try {
          const accessToken =
            await this.tokenService.getValidMicrosoftAccessToken(
              tokens,
              meeting.requesterId
            );
          if (accessToken) {
            const userResponse = await fetch(
              `${MICROSOFT_API_ENDPOINTS.GRAPH_API_BASE}/me`,
              {
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            );

            if (userResponse.ok) {
              const userData = await userResponse.json();
              userEmail = userData.mail || userData.userPrincipalName;

              if (userEmail) {
                await this.calendarService.updateIntegrationEmail(
                  meeting.requesterId,
                  "microsoft",
                  userEmail
                );
                this.logger.log(
                  `[Microsoft Cron] Successfully fetched and saved email ${userEmail} for integration ${integration.id}`
                );
                isPersonalAccount = isPersonalMicrosoftAccount(userEmail);
                accountTypeDetermined = true;
              }
            } else {
              const errorText = await userResponse.text();
              this.logger.warn(
                `[Microsoft Cron] Failed to fetch email from /me endpoint (${userResponse.status}): ${errorText}. Trying alternative methods...`
              );

              userEmail =
                await this.emailFetchService.fetchEmailFromAlternativeSources(
                  accessToken,
                  meeting.requesterId,
                  integration.id
                );

              if (userEmail) {
                isPersonalAccount = isPersonalMicrosoftAccount(userEmail);
                accountTypeDetermined = true;
              } else {
                this.logger.error(
                  `[Microsoft Cron] CRITICAL: Could not fetch email using any method for integration ${integration.id}. The integration may not work properly.`
                );
              }
            }
          }
        } catch (error) {
          this.logger.warn(
            `[Microsoft Cron] Error fetching email from Microsoft Graph API: ${
              error instanceof Error ? error.message : String(error)
            }. Will try Calendar Events API.`
          );
        }
      }
    } else {
      isPersonalAccount = isPersonalMicrosoftAccount(userEmail);
      accountTypeDetermined = true;
    }

    if (!accountTypeDetermined) {
      this.logger.log(
        `[Microsoft Cron] Account type unknown, attempting to determine by testing API access`
      );

      const tokens = await this.calendarService.getMicrosoftTokens(
        meeting.requesterId
      );
      if (tokens) {
        const accessToken =
          await this.tokenService.getValidMicrosoftAccessToken(
            tokens,
            meeting.requesterId
          );
        if (accessToken) {
          const testEventResponse = await fetch(
            `${MICROSOFT_API_ENDPOINTS.GRAPH_API_BASE}/me/events?$top=1`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          if (testEventResponse.ok) {
            this.logger.log(
              `[Microsoft Cron] Calendar Events API accessible. Will use Calendar Events API for meeting status.`
            );
            isPersonalAccount = true;
            accountTypeDetermined = true;
          } else {
            this.logger.log(
              `[Microsoft Cron] Calendar Events API not accessible. Will try OnlineMeetings API (Work/School account).`
            );
            isPersonalAccount = false;
            accountTypeDetermined = true;
          }
        }
      }
    }

    if (!accountTypeDetermined) {
      this.logger.warn(
        `[Microsoft Cron] Could not determine account type, defaulting to Work/School (OnlineMeetings API)`
      );
      isPersonalAccount = false;
    }

    return { userEmail, isPersonalAccount };
  }
}
