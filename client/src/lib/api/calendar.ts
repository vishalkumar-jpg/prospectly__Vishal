/**
 * Calendar API Module
 * Handles calendar integration endpoints
 */

import { request } from "./core";
import type { AnyType } from "../../types/common";
import type { CalendarIntegration } from "@/hooks/useCalendarIntegrations";

export const calendarApi = {
  getGoogleAuthUrl: () => request<{ authUrl: string }>("/calendar/auth/google"),

  getMicrosoftAuthUrl: () =>
    request<{ authUrl: string }>("/calendar/auth/microsoft"),

  saveGoogleTokens: (data: AnyType) =>
    request<{ integration: AnyType }>("/calendar/auth/google/save", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  saveMicrosoftTokens: (data: AnyType) =>
    request<{ integration: AnyType }>("/calendar/auth/microsoft/save", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // The core `request` helper unwraps the response `.data`, so this resolves
  // to the integrations array directly (not `{ integrations: [] }`).
  listIntegrations: () =>
    request<CalendarIntegration[]>("/calendar/integrations"),

  deleteIntegration: (id: number) =>
    request(`/calendar/integrations/${id}`, {
      method: "DELETE",
    }),
};
