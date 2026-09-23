import { oauthConfig } from "config/oauth.config";
import { toUTC } from "utils/dayjs";

export async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}> {
  const { clientId } = oauthConfig.google;
  const { clientSecret } = oauthConfig.google;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const tokenResponse = await fetch(oauthConfig.google.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Google token refresh failed: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  const now = toUTC().valueOf();

  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expiry_date: now + tokenData.expires_in * 1000,
  };
}
