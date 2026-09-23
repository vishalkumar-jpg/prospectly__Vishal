/**
 * Miscellaneous API Module
 * Handles system feedback, archive, emails, and presigned URL endpoints
 */

import { request } from "./core";
import { ApiError } from "./core";
import type { AnyType } from "../../types/common";

export const emailsApi = {
  send: (data: { requestId: number; introductionText: string }) =>
    request<{ email: AnyType }>("/emails/send", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getTemplate: (slug: string) =>
    request<{
      slug: string;
      subject: string;
      htmlContent: string;
      variables: string[];
    }>(`/email-templates/${slug}`),
};

import type { FeedbackRequest } from "@/types/system-feedback";

export const systemFeedbackApi = {
  create: (data: AnyType) =>
    request<AnyType>("/system-feedback", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listMine: () => request<FeedbackRequest[]>("/system-feedback/me"),

  uploadScreenshot: async (file: File | Blob) => {
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
      fileName = `screenshot.${extension}`;
    }

    // Step 1: Ask backend for a presigned PUT URL + S3 key
    const presignResponse = await request<{
      uploadUrl: string;
      key: string;
      expiresIn?: number;
    }>("/system-feedback/generate-presigned-url", {
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
        errorText || "Failed to upload screenshot to storage",
        putResponse.status
      );
    }

    return key;
  },
};

export const archiveApi = {
  getRequesterArchive: (params?: { search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) {
      qs.set("search", params.search);
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<AnyType[]>(
      `/requester/introduction-requests/archive${suffix}`
    );
  },

  archiveRequesterIntroduction: (
    requestId: string,
    body: { archiveReason: string; archiveNotes: string }
  ) =>
    request<{ success: boolean; message: string }>(
      `/requester/introduction-requests/${requestId}/archive`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),
};

export const presignedApi = {
  getPost: (params: {
    filePath: string;
    fileName?: string;
    fileType: string;
    accessControl?: string;
    metadata?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.filePath) searchParams.append("filePath", params.filePath);
    if (params.fileName) searchParams.append("fileName", params.fileName);
    if (params.fileType) searchParams.append("fileType", params.fileType);
    if (params.accessControl)
      searchParams.append("accessControl", params.accessControl);
    if (params.metadata) searchParams.append("metadata", params.metadata);

    return request<{
      signedRequest: {
        url: string;
        fields: Record<string, string>;
      };
      cloudFrontURL: string;
    }>(`/presigned/post?${searchParams.toString()}`);
  },
};

export const systemConfigurationApi = {
  getBySlug: (slug: string) =>
    request<{
      id: string;
      name: string;
      value: AnyType;
    }>(`/system-configuration/${slug}`),

  getAll: () =>
    request<
      {
        id: string;
        name: string;
        value: AnyType;
      }[]
    >("/system-configuration"),
};
