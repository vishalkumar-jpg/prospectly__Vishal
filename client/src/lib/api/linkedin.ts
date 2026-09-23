/**
 * LinkedIn API Module
 * Handles LinkedIn contact imports and uploads
 */

import { request } from "./core";
import type { AnyType } from "../../types/common";

export const linkedinApi = {
  generateUploadUrl: (data: { fileName: string; fileSize: string }) =>
    request<{ uploadUrl: string; key: string; expiresIn: number }>(
      "/contacts/linkedin/generate-presigned-url",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  completeUpload: (data: { s3Key: string }) =>
    request<{ success: boolean; jobId: string; importRecordId: string }>(
      "/contacts/linkedin/complete-upload",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  getImportStatus: (importRecordId: string) =>
    request<{
      importRecord: {
        id: string;
        status: string;
        imported: number;
        failed: number;
        duplicates: number;
        totalFetched: number;
        errorMessage?: string | null;
        startedAt?: string;
        completedAt?: string;
        createdAt: string;
      };
      linkedinImport: {
        id: string;
        linkedinProfileUrl?: string | null;
        profileData?: AnyType;
        extractionLog?: AnyType;
        processingLog?: AnyType;
      } | null;
    }>(`/contacts/linkedin/import-status/${importRecordId}`),
};
