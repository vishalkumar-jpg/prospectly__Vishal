import { Logger } from "@nestjs/common";
import { oauthConfig } from "config/oauth.config";

/**
 * Fetch a contact's profile photo from Microsoft Graph API
 * Returns the photo as a Buffer with mimeType, or null if not available
 * @param accessToken - Microsoft OAuth access token
 * @param contactId - Microsoft contact ID
 * @param logger - Optional logger instance for error logging
 * @returns Promise resolving to photo data or null
 */
export async function fetchMicrosoftContactPhoto(
  accessToken: string,
  contactId: string,
  logger?: Logger
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const photoResponse = await fetch(
      `${oauthConfig.microsoft.graphApiBaseUrl}/me/contacts/${contactId}/photo/$value`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (photoResponse.ok) {
      const arrayBuffer = await photoResponse.arrayBuffer();
      const mimeType =
        photoResponse.headers.get("content-type") || "image/jpeg";
      return {
        buffer: Buffer.from(arrayBuffer),
        mimeType,
      };
    }
  } catch (error) {
    if (logger) {
      logger.debug(`Failed to fetch photo for contact ${contactId}: ${error}`);
    }
  }
  return null;
}
