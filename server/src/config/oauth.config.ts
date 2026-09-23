import { registerAs } from "@nestjs/config";
import { getOsEnv } from "config/env.config";
import { appConfig } from "./app.config";

const getOAuthConfig = () => {
  return {
    google: {
      clientId: getOsEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getOsEnv("GOOGLE_CLIENT_SECRET"),
      redirectUri: `${appConfig.apiUrl}/auth/google/callback`,
      calendarRedirectUri: `${appConfig.frontendUrl}/calendar/callback/google`,
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      calendarApiBaseUrl: "https://www.googleapis.com/calendar/v3",
      meetApiBaseUrl: "https://meet.googleapis.com/v2",
      peopleApiBaseUrl: "https://people.googleapis.com/v1",
      userinfoApiBaseUrl: "https://www.googleapis.com/oauth2/v2",
      scopes: [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/meetings.space.readonly",
      ],
      loginScopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/contacts.readonly",
        "https://www.googleapis.com/auth/contacts.other.readonly",
        "https://www.googleapis.com/auth/directory.readonly",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/meetings.space.readonly",
      ],
      contactsScopes: [
        "https://www.googleapis.com/auth/contacts.readonly",
        "https://www.googleapis.com/auth/contacts.other.readonly",
        "https://www.googleapis.com/auth/directory.readonly",
      ],
    },
    microsoft: {
      clientId: getOsEnv("MICROSOFT_CLIENT_ID"),
      clientSecret: getOsEnv("MICROSOFT_CLIENT_SECRET"),
      redirectUri:
        getOsEnv("MICROSOFT_AUTH_REDIRECT_URI") ||
        `${appConfig.apiUrl}/auth/microsoft/callback`,
      calendarRedirectUri: `${appConfig.frontendUrl}/calendar/callback/microsoft`,
      authority: "https://login.microsoftonline.com/common",
      tokenEndpoint:
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      authorizeEndpoint:
        "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      graphApiBaseUrl: "https://graph.microsoft.com/v1.0",
      // Delegated scopes for both Personal and Work/School accounts
      scopes: [
        "Calendars.ReadWrite",
        "Calendars.Read",
        "offline_access",
        "OnlineMeetings.ReadWrite",
        "OnlineMeetingArtifact.Read.All",
      ],
      loginScopes: [
        "openid",
        "email",
        "profile",
        "User.Read",
        "offline_access",
        "Contacts.Read",
        "Calendars.ReadWrite",
        "OnlineMeetings.ReadWrite",
        "OnlineMeetingArtifact.Read.All",
      ],
      contactsScopes: ["Contacts.Read", "User.Read", "offline_access"],
    },
    apple: {
      contactsBaseUrl: "https://contacts.icloud.com",
    },
  };
};

export const oauthConfig = getOAuthConfig();

export default registerAs("oauth", getOAuthConfig);
