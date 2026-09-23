/**
 * Auth API Module
 * Handles authentication-related endpoints
 */

import { request } from "./core";
import type { AnyType } from "../../types/common";

export const authApi = {
  me: (options?: { skipAutoRefresh?: boolean }) =>
    request<AnyType>("/auth/me", options),

  updateProfile: (data: AnyType) =>
    request<AnyType>("/auth/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  refresh: () =>
    request<AnyType>("/auth/refresh", {
      method: "POST",
    }),

  logout: () =>
    request<AnyType>("/auth/logout", {
      method: "POST",
    }),
};
