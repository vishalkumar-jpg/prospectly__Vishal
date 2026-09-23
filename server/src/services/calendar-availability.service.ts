import { decrypt, encrypt } from "utils/encryption";
import { refreshGoogleToken } from "services/google-calendar.service";
import { refreshMicrosoftToken } from "services/microsoft-calendar.service";
import { db } from "database/db";
import { calendarIntegrations } from "database/schema";
import { eq } from "drizzle-orm";
import { oauthConfig } from "config/oauth.config";
import { toUserFriendlyCalendarError } from "modules/calendar/shared/calendar-error.utils";
import { toUTC, utcDayjs } from "utils/dayjs";

// Helper to decrypt calendar access tokens
export function decryptCalendarToken(encryptedToken: string): string {
  try {
    if (!encryptedToken) {
      return "";
    }

    // The encrypted token is in format: data:iv:authTag
    const parts = encryptedToken.split(":");
    if (parts.length !== 3) {
      return "";
    }

    const [data, iv, authTag] = parts;

    const decrypted = decrypt({ data, iv, authTag });
    return decrypted;
  } catch {
    return "";
  }
}

// Helper to check if token is expired and refresh if needed
export async function ensureValidToken(
  integrationId: string,
  provider: string,
  encryptedAccessToken: string,
  encryptedRefreshToken: string | null,
  tokenExpiresAt: Date | null
): Promise<string> {
  try {
    // Check if token is expired (with 5 minute buffer)
    const now = utcDayjs();
    const expiryThreshold = now.add(5, "minute");

    const isExpired =
      !tokenExpiresAt || utcDayjs(tokenExpiresAt).isBefore(expiryThreshold);

    if (!isExpired) {
      return decryptCalendarToken(encryptedAccessToken);
    }

    if (!encryptedRefreshToken) {
      throw new Error(
        "No refresh token available. Please reconnect your calendar."
      );
    }

    // Decrypt refresh token
    const refreshToken = decryptCalendarToken(encryptedRefreshToken);
    if (!refreshToken) {
      throw new Error("Failed to decrypt refresh token");
    }

    // Refresh the token based on provider
    interface TokenResponse {
      access_token: string;
      refresh_token?: string;
      expiry_date?: string | number | Date;
    }
    let newTokens: TokenResponse;
    if (provider === "google") {
      newTokens = await refreshGoogleToken(refreshToken);
    } else if (provider === "microsoft") {
      newTokens = await refreshMicrosoftToken(refreshToken);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!newTokens.access_token) {
      throw new Error("Token refresh did not return access token");
    }

    // Encrypt new tokens
    const encryptedNewAccessToken = encrypt(newTokens.access_token);
    const accessTokenEncrypted = `${encryptedNewAccessToken.data}:${encryptedNewAccessToken.iv}:${encryptedNewAccessToken.authTag}`;

    let refreshTokenEncrypted = encryptedRefreshToken; // Keep old refresh token by default
    if (newTokens.refresh_token) {
      const encryptedNewRefreshToken = encrypt(newTokens.refresh_token);
      refreshTokenEncrypted = `${encryptedNewRefreshToken.data}:${encryptedNewRefreshToken.iv}:${encryptedNewRefreshToken.authTag}`;
    }

    const newTokenExpiresAt = newTokens.expiry_date
      ? toUTC(newTokens.expiry_date)
      : null;

    // Update database with new tokens
    await db
      .update(calendarIntegrations)
      .set({
        accessToken: accessTokenEncrypted,
        refreshToken: refreshTokenEncrypted,
        tokenExpiresAt: newTokenExpiresAt,
        updatedAt: toUTC(),
      })
      .where(eq(calendarIntegrations.id, integrationId));

    return newTokens.access_token;
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("[TOKEN] Error ensuring valid token");
  }
}

// Fetch calendar events from Google Calendar
export async function fetchGoogleCalendarEvents(
  accessToken: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const response = await fetch(
      `${oauthConfig.google.calendarApiBaseUrl}/calendars/primary/events?` +
        `timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}&` +
        `singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(toUserFriendlyCalendarError("", 401, "Google"));
      }

      const errorBody = await response.text();
      throw new Error(
        toUserFriendlyCalendarError(errorBody, response.status, "Google")
      );
    }

    const data = (await response.json()) as { items?: unknown[] };
    return data.items || [];
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("Error fetching Google calendar events");
  }
}

// Fetch calendar events from Microsoft Calendar
export async function fetchMicrosoftCalendarEvents(
  accessToken: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const response = await fetch(
      `${oauthConfig.microsoft.graphApiBaseUrl}/me/calendar/calendarView?` +
        `startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(toUserFriendlyCalendarError("", 401, "Microsoft"));
      }

      const errorBody = await response.text();
      throw new Error(
        toUserFriendlyCalendarError(errorBody, response.status, "Microsoft")
      );
    }

    const data = (await response.json()) as { value?: unknown[] };
    return data.value || [];
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("Error fetching Microsoft calendar events");
  }
}

// Generate available slots based on busy events (business hours only: 9 AM - 5 PM, weekdays)
interface CalendarEvent {
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

export function generateAvailableSlots(
  busyEvents: CalendarEvent[],
  startDate: Date,
  endDate: Date,
  _timezone = "UTC"
) {
  const slots = [];
  // Use dayjs for loop control
  let current = utcDayjs(startDate).hour(9).minute(0).second(0).millisecond(0);
  const end = utcDayjs(endDate);
  const now = utcDayjs();

  while (current.isBefore(end)) {
    // Skip weekends (0 = Sunday, 6 = Saturday)
    const day = current.day();
    if (day !== 0 && day !== 6) {
      // Generate slots from 9 AM to 5 PM (17:00)
      for (let hour = 9; hour < 17; hour++) {
        const slotStart = current.hour(hour).minute(0).second(0).millisecond(0);
        const slotEnd = slotStart.add(30, "minute");

        // Check if slot is not busy
        const isBusy = busyEvents.some((event) => {
          const eventStart = utcDayjs(
            event.start?.dateTime || event.start?.date || 0
          );
          const eventEnd = utcDayjs(
            event.end?.dateTime || event.end?.date || 0
          );
          return slotStart.isBefore(eventEnd) && slotEnd.isAfter(eventStart);
        });

        // Only include future slots that are not busy
        if (!isBusy && slotStart.isAfter(now)) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
          });
        }
      }
    }
    current = current.add(1, "day");
  }

  return slots;
}

// Main function to get availability for a calendar integration
export async function getCalendarAvailability(
  integrationId: string,
  provider: string,
  encryptedAccessToken: string,
  encryptedRefreshToken: string | null,
  tokenExpiresAt: Date | null,
  daysAhead = 30
) {
  try {
    // Ensure we have a valid access token (will refresh if expired)
    const accessToken = await ensureValidToken(
      integrationId,
      provider,
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt
    );

    if (!accessToken) {
      throw new Error("Failed to get valid access token");
    }

    // Calculate date range
    const now = toUTC();
    const endDate = utcDayjs(now).add(daysAhead, "day").toDate();

    let busyEvents = [];

    // Fetch events based on provider
    if (provider === "google") {
      busyEvents = await fetchGoogleCalendarEvents(accessToken, now, endDate);
    } else if (provider === "microsoft") {
      busyEvents = await fetchMicrosoftCalendarEvents(
        accessToken,
        now,
        endDate
      );
    } else {
      throw new Error(`Unsupported calendar provider: ${provider}`);
    }

    // Generate available slots
    const availableSlots = generateAvailableSlots(busyEvents, now, endDate);

    return availableSlots;
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("[CALENDAR] Error getting calendar availability");
  }
}
