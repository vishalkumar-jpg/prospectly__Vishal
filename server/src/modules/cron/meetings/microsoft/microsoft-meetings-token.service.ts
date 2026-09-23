import { Injectable, Logger } from "@nestjs/common";
import { oauthConfig } from "config/oauth.config";
import { CalendarService } from "modules/calendar/calendar.service";
import { toUTC } from "utils/dayjs";
import {
  MICROSOFT_API_ENDPOINTS,
  TOKEN_EXPIRY_BUFFER_MS,
  MEETINGS_MESSAGES,
} from "../meetings.constants";
import { GoogleTokenData, MicrosoftTokenResponse } from "../meetings.types";

@Injectable()
export class MicrosoftMeetingsTokenService {
  private readonly logger = new Logger(MicrosoftMeetingsTokenService.name);

  constructor(private readonly calendarService: CalendarService) {}

  async getValidMicrosoftAccessToken(
    tokens: GoogleTokenData,
    userId: string
  ): Promise<string | null> {
    const expiresAt = tokens.expiryDate
      ? new Date(tokens.expiryDate)
      : new Date(0);

    if (this.isTokenExpiringSoon(expiresAt)) {
      const refreshedToken = await this.refreshMicrosoftToken(tokens, userId);
      return refreshedToken || tokens.accessToken;
    }

    return tokens.accessToken;
  }

  async refreshMicrosoftToken(
    tokens: GoogleTokenData,
    userId: string
  ): Promise<string | null> {
    const { clientId, clientSecret } = oauthConfig.microsoft;

    if (!clientId || !clientSecret) {
      this.logger.error(
        MEETINGS_MESSAGES.ERROR.MICROSOFT_OAUTH_NOT_CONFIGURED("token refresh")
      );
      return null;
    }

    try {
      const tokenResponse = await fetch(MICROSOFT_API_ENDPOINTS.TOKEN_REFRESH, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokens.refreshToken || "",
          grant_type: "refresh_token",
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        this.logger.error(
          MEETINGS_MESSAGES.ERROR.MICROSOFT_TOKEN_REFRESH_FAILED(
            tokenResponse.status,
            errorText,
            userId
          )
        );
        return null;
      }

      const newTokenData =
        (await tokenResponse.json()) as MicrosoftTokenResponse;
      const now = toUTC();

      const existingIntegration =
        await this.calendarService.getActiveCalendarIntegration(userId);
      const existingEmail =
        existingIntegration?.provider === "microsoft"
          ? existingIntegration.email
          : null;

      let userEmail = existingEmail;
      if (!userEmail) {
        try {
          const userResponse = await fetch(
            `${MICROSOFT_API_ENDPOINTS.GRAPH_API_BASE}/me`,
            {
              headers: { Authorization: `Bearer ${newTokenData.access_token}` },
            }
          );

          if (userResponse.ok) {
            const userData = await userResponse.json();
            userEmail = userData.mail || userData.userPrincipalName;
          }
        } catch (error) {
          this.logger.warn(
            `Failed to fetch user email during token refresh for user ${userId}`,
            error
          );
        }
      }

      await this.calendarService.saveMicrosoftTokens(userId, {
        accessToken: newTokenData.access_token,
        refreshToken: newTokenData.refresh_token || tokens.refreshToken,
        expiryDate: new Date(
          now.getTime() + newTokenData.expires_in * 1000
        ).getTime(),
        email: userEmail,
      });

      return newTokenData.access_token;
    } catch (error) {
      this.logger.error(
        MEETINGS_MESSAGES.ERROR.TOKEN_REFRESH_ERROR(
          error instanceof Error ? error.message : String(error)
        )
      );
      return null;
    }
  }

  private isTokenExpiringSoon(expiresAt: Date): boolean {
    const now = toUTC();
    const bufferTime = toUTC(now.valueOf() + TOKEN_EXPIRY_BUFFER_MS);
    return expiresAt <= bufferTime;
  }
}
