/**
 * Contacts API Module
 * Handles contact management endpoints
 */

import { request } from "./core";
import type { AnyType } from "../../types/common";

/** Allowed `sortBy` values for GET /contacts (must match server). */
export const CONTACT_LIST_SORT_BY = [
  "contact",
  "email",
  "company",
  "linkedin",
  "bountyAmount",
  "source",
  "updatedAt",
] as const;

export type ContactListSortBy = (typeof CONTACT_LIST_SORT_BY)[number];

/** `sortDir` sent on the contacts list query (server also accepts "default" on DTO; client omits for default). */
export type ContactListQuerySortDir = "asc" | "desc";

export const contactsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    searchTerm?: string;
    sortBy?: ContactListSortBy;
    sortDir?: ContactListQuerySortDir;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.searchTerm)
      searchParams.append("searchTerm", params.searchTerm);
    if (params?.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params?.sortDir) searchParams.append("sortDir", params.sortDir);

    const queryString = searchParams.toString();
    return request<{
      contacts: AnyType[];
      pagination: {
        page: number;
        limit: number;
        totalContacts: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>(`/contacts${queryString ? `?${queryString}` : ""}`);
  },

  searchGlobal: (params: {
    q?: string;
    linkedinUrl?: string;
    name?: string;
    email?: string;
    company?: string;
    website?: string;
    limit?: number;
  }) => {
    return request<{
      contacts: AnyType[];
      count: number;
      query: string;
    }>("/contacts/search-global", {
      method: "POST",
      body: JSON.stringify({
        q: params.q,
        linkedinUrl: params.linkedinUrl,
        name: params.name,
        email: params.email,
        company: params.company,
        website: params.website,
        limit: params.limit,
      }),
    });
  },

  create: (data: AnyType) =>
    request<{ contact: AnyType }>("/contacts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  get: (id: number) => request<{ contact: AnyType }>(`/contacts/${id}`),

  update: (id: number, data: AnyType) =>
    request<{ contact: AnyType }>(`/contacts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  updateBountyAmount: (id: number, bountyAmount: string) =>
    request<{ success: boolean; bountyAmount: string }>(
      `/contacts/${id}/bounty-amount`,
      {
        method: "PATCH",
        body: JSON.stringify({ bountyAmount }),
      }
    ),

  searchTypesense: (params: {
    q?: string;
    linkedinUrl?: string;
    name?: string;
    title?: string;
    company?: string;
    website?: string;
    location?: string;
    limit?: number;
    page?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.append("q", params.q);
    if (params.linkedinUrl)
      searchParams.append("linkedinUrl", params.linkedinUrl);
    if (params.name) searchParams.append("name", params.name);
    if (params.title) searchParams.append("title", params.title);
    if (params.company) searchParams.append("company", params.company);
    if (params.website) searchParams.append("website", params.website);
    if (params.location) searchParams.append("location", params.location);
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.page) searchParams.append("page", params.page.toString());

    const queryString = searchParams.toString();
    return request<{
      contacts: AnyType[];
      count: number;
      query: string;
      hasNextPage: boolean;
    }>(`/typesense/search/contacts?${queryString}`);
  },

  calculateBounty: (params: { id: string }) =>
    request<{ success: boolean; bountyAmount: number | null }>(
      "/introductions/bounty-calculator/calculate",
      {
        method: "POST",
        body: JSON.stringify(params),
      }
    ),

  enrichContact: (params: {
    id: string;
    source: "contacts" | "apollo";
    linkedin_url?: string;
  }) =>
    request<{
      id: number;
      firstName: string | null;
      lastName: string | null;
      title: string | null;
      company: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      location: string | null;
      linkedin: string | null;
      profilePhotoUrl: string | null;
      companyDomain: string | null;
      companyIndustry: string | null;
      companyDescription: string | null;
      companyLinkedinUrl: string | null;
      companyType: string | null;
      employees: string | null;
      website: string | null;
      industry: string | null;
      linkedinConnections: string | null;
      bountyAmount: string | null;
      enrichmentStatus: string;
    }>("/introductions/contact-enrichment/enrich", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getContactDetails: (contactId: string) =>
    request<{
      id: number;
      firstName: string | null;
      lastName: string | null;
      title: string | null;
      company: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      location: string | null;
      linkedin: string | null;
      profilePhotoUrl: string | null;
      companyDomain: string | null;
      companyIndustry: string | null;
      companyDescription: string | null;
      companyLinkedinUrl: string | null;
      companyType: string | null;
      employees: string | null;
      website: string | null;
      industry: string | null;
      linkedinConnections: string | null;
      bountyAmount: string | null;
      enrichmentStatus: string;
      headline: string | null;
      seniority: string | null;
      departments: string[] | null;
      functions: string[] | null;
      employmentHistory:
        | {
            current: boolean;
            organizationName: string;
            title: string;
            startDate: string | null;
            endDate: string | null;
          }[]
        | null;
      twitterUrl: string | null;
      githubUrl: string | null;
      facebookUrl: string | null;
      companyFoundedYear: number | null;
      companyRevenue: string | null;
      companyMarketCap: string | null;
      companyPhone: string | null;
      companyCity: string | null;
      companyState: string | null;
      companyCountry: string | null;
      companyLogoUrl: string | null;
      companyFacebookUrl: string | null;
      companyTwitterUrl: string | null;
      companyPrimaryDomain: string | null;
      emailStatus: string | null;
      connectorCount: number;
      hasEmail: boolean;
      enrichmentSource: "apollo" | "zoom_info" | "clay" | null;
    }>(`/introductions/contact-enrichment/${contactId}/details`),

  checkEmail: (email: string) =>
    request<{ exists: boolean; message?: string }>("/contacts/check-email", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim(),
      }),
    }),

  getGoogleImportStatus: () =>
    request<{
      hasImport: boolean;
      connected: boolean;
      status?: string;
    }>("/contacts/google-import/status"),

  getMicrosoftImportStatus: () =>
    request<{
      hasImport: boolean;
      connected: boolean;
      status?: string;
    }>("/contacts/microsoft-import/status"),

  getAppleImportStatus: () =>
    request<{
      hasImport: boolean;
      connected: boolean;
      status?: string;
    }>("/contacts/apple-import/status"),

  listImportAccounts: (provider?: "google" | "microsoft" | "apple") => {
    const q =
      provider !== undefined ? `?provider=${encodeURIComponent(provider)}` : "";
    return request<{
      maxAccountsPerProvider: number;
      combinedLatestImportTotals: {
        totalFetched: number;
        imported: number;
        duplicates: number;
      };
      accounts: Array<{
        id: string;
        provider: string;
        email: string | null;
        isPrimary: boolean;
        isActive: boolean;
        tokenExpiresAt: string | null;
        createdAt: string;
        updatedAt: string;
        latestImport: {
          id: string;
          status: string;
          imported: number;
          failed: number;
          duplicates: number;
          totalFetched: number;
          errorMessage: string | null;
          startedAt: string | null;
          completedAt: string | null;
          createdAt: string;
        } | null;
      }>;
    }>(`/contacts/import-accounts${q}`);
  },

  disconnectImportAccount: (tokenId: string) =>
    request<{ success: boolean }>(
      `/contacts/import-accounts/${encodeURIComponent(tokenId)}/disconnect`,
      { method: "POST" }
    ),

  resyncImportAccount: (tokenId: string) =>
    request<{
      success?: boolean;
      message?: string;
      jobId?: string;
      warning?: string;
    }>(`/contacts/import-accounts/${encodeURIComponent(tokenId)}/resync`, {
      method: "POST",
    }),
};
