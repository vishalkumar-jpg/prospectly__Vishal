import { AnyType } from "@/types/common";
import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export type LinkedInUploadPhase =
  | "idle"
  | "presign"
  | "s3_upload"
  | "complete"
  | "success"
  | "error";

export type LinkedInUploadErrorStep = "presign" | "s3_upload" | "complete";

interface LinkedInImportResult {
  success: boolean;
  jobId?: string;
  importRecordId?: string;
  error?: string;
}

interface LinkedInImportStatus {
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
}

export function useLinkedInImport() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<LinkedInUploadPhase>("idle");
  const [uploadErrorStep, setUploadErrorStep] =
    useState<LinkedInUploadErrorStep | null>(null);
  const [importStatus, setImportStatus] = useState<LinkedInImportStatus | null>(
    null
  );

  const uploadLinkedInZip = useCallback(async (file: File): Promise<LinkedInImportResult> => {
    setIsUploading(true);
    setUploadErrorStep(null);
    setUploadPhase("presign");
    let errorStepForCatch: LinkedInUploadErrorStep = "presign";
    try {
      const { uploadUrl, key } = await api.linkedin.generateUploadUrl({
        fileName: file.name,
        fileSize: file.size.toString(),
      });

      errorStepForCatch = "s3_upload";
      setUploadPhase("s3_upload");
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": "application/zip",
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(errorText || "Failed to upload file to storage");
      }

      errorStepForCatch = "complete";
      setUploadPhase("complete");
      const result = await api.linkedin.completeUpload({ s3Key: key });

      setUploadPhase("success");
      return {
        success: true,
        jobId: result.jobId,
        importRecordId: result.importRecordId,
      };
    } catch (error) {
      setUploadPhase("error");
      setUploadErrorStep(errorStepForCatch);
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsUploading(false);
    }
  }, []);

  const checkImportStatus = useCallback(
    async (importRecordId: string): Promise<LinkedInImportStatus | null> => {
      try {
        const status = await api.linkedin.getImportStatus(importRecordId);
        setImportStatus(status);
        return status;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to check status";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return null;
      }
    },
    []
  );

  return {
    uploadLinkedInZip,
    checkImportStatus,
    isUploading,
    uploadPhase,
    uploadErrorStep,
    importStatus,
  };
}
