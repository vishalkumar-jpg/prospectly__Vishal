/**
 * Meetings API Module
 * Handles meeting management endpoints
 */

import { request } from "./core";
import type { AnyType } from "../../types/common";

export const meetingsApi = {
  create: (data: {
    requestId: number;
    scheduledAt: string;
    duration: number;
    meetingPlatform?: string;
    meetingLink?: string;
  }) =>
    request<{ meeting: AnyType }>("/meetings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  list: (requestId: number) =>
    request<{ meetings: AnyType[] }>(`/meetings?requestId=${requestId}`),

  confirm: (id: number) =>
    request<{ meeting: AnyType; payment: AnyType }>(`/meetings/${id}/confirm`, {
      method: "PATCH",
    }),

  complete: (id: number) =>
    request<{ meeting: AnyType }>(`/meetings/${id}/complete`, {
      method: "PATCH",
    }),

  cancel: (id: number) =>
    request<{ meeting: AnyType }>(`/meetings/${id}/cancel`, {
      method: "PATCH",
    }),
};
