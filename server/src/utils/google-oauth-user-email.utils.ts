import { Logger } from "@nestjs/common";
import { oauthConfig } from "config/oauth.config";

const logger = new Logger("GoogleOAuthUserEmail");

export type GoogleOAuthTokensLite = {
  id_token?: string | null;
  access_token?: string | null;
};

/** Minimal surface for `verifyIdToken` used by googleapis OAuth2 client. */
export type GoogleOAuth2VerifyClient = {
  verifyIdToken: (options: {
    idToken: string;
    audience: string;
  }) => Promise<{ getPayload: () => { email?: string } | null }>;
};

/**
 * Resolve the Google account email after an OAuth code exchange (id_token first, then userinfo).
 */
export async function getGoogleUserEmailFromOAuthTokens(
  tokens: GoogleOAuthTokensLite,
  oauth2Client: GoogleOAuth2VerifyClient,
  clientId: string
): Promise<string | null> {
  let userEmail: string | null = null;

  if (tokens.id_token) {
    try {
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      userEmail = payload?.email || null;
      if (userEmail) {
        return userEmail;
      }
    } catch (error) {
      logger.warn(
        `Failed to extract email from id_token: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (!userEmail && tokens.access_token) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const userInfoResponse = await fetch(
        `${oauthConfig.google.userinfoApiBaseUrl}/userinfo`,
        {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        }
      );

      clearTimeout(timeout);

      if (userInfoResponse.ok) {
        const userInfo: { email?: string; emailAddress?: string } =
          await userInfoResponse.json();
        userEmail = userInfo.email || userInfo.emailAddress || null;
        if (userEmail) {
          return userEmail;
        }
      }
    } catch (error) {
      logger.warn(
        `Failed to fetch user email from Google userinfo API: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (!userEmail) {
    logger.warn(
      "Could not retrieve email for Google account from id_token or userinfo."
    );
  }

  return userEmail;
}
