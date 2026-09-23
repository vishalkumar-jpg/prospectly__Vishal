import { request } from "./core";

export type NotificationPreferenceCategory = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  groupKey: string;
  groupLabel: string;
  isMandatory: boolean;
  enabled: boolean;
};

export type NotificationPreferencesPayload = {
  maskedEmail?: string;
  unsubscribeAll: boolean;
  isRegistered: boolean;
  categories: NotificationPreferenceCategory[];
};

export type SaveNotificationPreferencesBody = {
  categories: { categoryId: string; enabled: boolean }[];
  unsubscribeAll?: boolean;
};

export const notificationPreferencesApi = {
  getMine: () =>
    request<NotificationPreferencesPayload>("/notification-preferences/me"),

  saveMine: (body: SaveNotificationPreferencesBody) =>
    request<NotificationPreferencesPayload>("/notification-preferences/me", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  getPublic: (query: { u?: string; e?: string; sig?: string }) => {
    const params = new URLSearchParams();
    if (query.u) params.set("u", query.u);
    if (query.e) params.set("e", query.e);
    if (query.sig) params.set("sig", query.sig);
    const qs = params.toString();
    return request<NotificationPreferencesPayload>(
      `/notification-preferences/public${qs ? `?${qs}` : ""}`
    );
  },

  savePublic: (
    body: SaveNotificationPreferencesBody & {
      u?: string;
      e?: string;
      sig: string;
    }
  ) =>
    request<NotificationPreferencesPayload>(
      "/notification-preferences/public",
      {
        method: "PUT",
        body: JSON.stringify(body),
      }
    ),
};
