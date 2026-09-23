/**
 * Privacy API Module
 * Handles privacy settings and domain management
 */

import { request } from "./core";

export const privacyApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    order?: string;
    isPagination?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.sort) queryParams.append("sort", params.sort);
    if (params?.order) queryParams.append("order", params.order);
    if (params?.isPagination !== undefined)
      queryParams.append("isPagination", params.isPagination.toString());

    const queryString = queryParams.toString();
    return request<{
      data: Array<{
        id: string;
        domain: string;
        reason: string;
        hideProfile: boolean;
        hideBounties: boolean;
        excludeFromSearch: boolean;
        createdAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/privacy${queryString ? `?${queryString}` : ""}`);
  },

  create: (data: {
    domain: string;
    reason: string;
    hideProfile?: boolean;
    hideBounties?: boolean;
    excludeFromSearch?: boolean;
  }) =>
    request<{ message: string }>("/privacy", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: {
      domain?: string;
      reason?: string;
      hideProfile?: boolean;
      hideBounties?: boolean;
      excludeFromSearch?: boolean;
    }
  ) =>
    request<{ message: string }>(`/privacy/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (ids: string[]) =>
    request<{ message: string }>("/privacy", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),
};
