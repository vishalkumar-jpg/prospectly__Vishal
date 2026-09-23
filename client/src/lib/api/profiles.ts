/**
 * Profiles API Module
 * Handles user profile management endpoints
 */

import { request } from "./core";
import { ApiError } from "./core";
import type { AnyType } from "../../types/common";
import type { AccountDeletionSurveyData } from "@shared/account-deletion-surveys";

/** A profile field collected by the completion gate. */
export type ProfileCompletionStep = "country" | "organization";

export interface CompletionOrganization {
  id: string;
  name: string;
  /** False while the organization is pending admin approval. */
  isActive: boolean;
}

export interface CurrentOrganization extends CompletionOrganization {
  /** Only invite-granted memberships are verified. */
  isVerified: boolean;
}

export interface ProfileCompletionStatus {
  /** Reflects required steps only — optional steps never block the app. */
  isComplete: boolean;
  missingSteps: ProfileCompletionStep[];
  /** Optional steps still worth prompting for. */
  optionalSteps: ProfileCompletionStep[];
  suggestions?: {
    country?: {
      /** Raw detected ISO alpha-2 code, or null when detection was unavailable. */
      detected: string | null;
      /** True only when the detected country is a supported payout country. */
      supported: boolean;
    };
  };
  current?: {
    organization: CurrentOrganization | null;
  };
}

/** Payload for `updateCompletion`. */
export interface ProfileCompletionUpdate {
  country?: string;
  organizationId?: string;
  /** Creates a new organization pending approval. */
  organizationName?: string;
  skipOrganization?: boolean;
}

export interface ProfileCompletionResult {
  isComplete: boolean;
  missingSteps: ProfileCompletionStep[];
  optionalSteps: ProfileCompletionStep[];
  country: string | null;
  payoutCurrency: string | null;
  organization: CurrentOrganization | null;
}

export interface CompletionOrganizationsResponse {
  organizations: CompletionOrganization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const profilesApi = {
  get: () => request<AnyType>("/profiles/me"),

  update: (data: AnyType) =>
    request<AnyType>("/profiles/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  uploadPhoto: async (
    file: File | Blob,
    firstName: string,
    lastName: string
  ) => {
    // Derive filename from file or MIME type
    let fileName: string;
    const fileLike: AnyType = file as AnyType;
    const mimeType: string = fileLike.type || "image/jpeg";
    const fileSize: number =
      typeof fileLike.size === "number" ? fileLike.size : 0;

    if (file instanceof File && file.name) {
      fileName = file.name;
    } else {
      const mimeToExt: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
      };
      const extension = mimeToExt[mimeType] || "jpg";
      fileName = `profile.${extension}`;
    }

    // Step 1: Ask backend for a presigned PUT URL + S3 key
    const presignResponse = await request<{
      uploadUrl: string;
      key: string;
      expiresIn?: number;
    }>("/profiles/me/generate-presigned-url", {
      method: "POST",
      body: JSON.stringify({
        fileName,
        fileSize,
        mimeType,
      }),
    });

    const { uploadUrl, key } = presignResponse;

    // Step 2: Upload file directly to S3 using the presigned URL
    const putResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": mimeType,
      },
    });

    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      throw new ApiError(
        errorText || "Failed to upload profile photo to storage",
        putResponse.status
      );
    }

    // Step 3: Persist the S3 key in the user profile via existing update endpoint
    const updatedProfile = await request<AnyType>("/profiles/me", {
      method: "PUT",
      body: JSON.stringify({
        profilePhotoUrl: key,
        firstName,
        lastName,
      }),
    });

    return updatedProfile;
  },

  stats: () =>
    request<{
      trustPoints: number;
      connections: number;
      introductions: number;
      activeBounties: number;
    }>("/profiles/me/stats"),

  getOrganizations: () => request<AnyType[]>("/profiles/me/organizations"),

  getConfiguration: () =>
    request<AnyType>("/profiles/me/configuration", { method: "GET" }),

  updateConfiguration: (data: AnyType) =>
    request<AnyType>("/profiles/me/configuration", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  markWelcomePopupSeen: () =>
    request<AnyType>("/profiles/me/welcome-popup-seen", {
      method: "PUT",
    }),

  markSkipBankAccount: () =>
    request<AnyType>("/profiles/me/skip-bank-account", {
      method: "PUT",
    }),

  /**
   * Required profile fields that gate app access, plus server-derived
   * suggestions (e.g. country detected from the caller's IP).
   */
  getCompletion: () =>
    request<ProfileCompletionStatus>("/profiles/me/completion"),

  /**
   * Submits one or more completion steps. Intentionally generic — later steps
   * (e.g. organization) go through this same call.
   */
  updateCompletion: (data: ProfileCompletionUpdate) =>
    request<ProfileCompletionResult>("/profiles/me/completion", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /** Organizations selectable in the gate, including ones pending approval. */
  getCompletionOrganizations: (params: { search?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));

    const suffix = query.toString() ? `?${query.toString()}` : "";

    return request<CompletionOrganizationsResponse>(
      `/profiles/me/completion/organizations${suffix}`
    );
  },

  deleteAccount: (
    confirm: boolean,
    survey?: {
      surveyData: AccountDeletionSurveyData;
    }
  ) =>
    request<{
      scheduledAt: string | null;
      immediate: boolean;
    }>("/profiles/me/delete-account", {
      method: "POST",
      body: JSON.stringify({
        confirm,
        surveyData: survey?.surveyData,
      }),
    }),

  cancelDeleteAccount: () =>
    request<{ cancelled: boolean }>("/profiles/me/cancel-delete-account", {
      method: "POST",
    }),
};
