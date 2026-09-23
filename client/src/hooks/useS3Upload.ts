import { useState, useCallback } from "react";
import api from "@/lib/api";

export interface UploadedFileData {
  filePath: string;
  fileName: string;
  fileType: "image" | "video" | "document";
  mimeType: string;
  size: number;
  previewUrl: string;
}

export interface UseS3UploadOptions {
  accessControl?: "public-read" | "private" | "none";
  folder?: string;
  onSuccess?: (data: UploadedFileData) => void;
  onError?: (error: Error) => void;
}

export interface UseS3UploadReturn {
  upload: (file: File) => Promise<UploadedFileData | null>;
  isUploading: boolean;
  progress: number;
  error: string | null;
  reset: () => void;
}

function generateUniqueFileName(
  originalName: string,
  folder: string = "images"
): string {
  const parts = originalName.split(".");
  const extension = parts.length > 1 ? parts.pop() : "";
  const uuid = crypto.randomUUID();
  return extension ? `${folder}/${uuid}.${extension}` : `${folder}/${uuid}`;
}

function getFileTypeFromMimeType(
  mimeType: string
): "image" | "video" | "document" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

export function useS3Upload(
  options: UseS3UploadOptions = {}
): UseS3UploadReturn {
  const {
    accessControl = "none",
    folder = "images",
    onSuccess,
    onError,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  const upload = useCallback(
    async (file: File): Promise<UploadedFileData | null> => {
      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        const uniquePath = generateUniqueFileName(file.name, folder);

        setProgress(10);
        const presignedResponse = await api.presigned.getPost({
          filePath: uniquePath,
          fileName: file.name,
          fileType: file.type,
          accessControl,
        });

        const signedRequest = presignedResponse?.signedRequest;
        const cloudFrontURL = presignedResponse?.cloudFrontURL || "";

        if (!signedRequest?.url || !signedRequest?.fields) {
          throw new Error("Failed to get presigned URL");
        }

        const { url, fields } = signedRequest;

        setProgress(30);

        const formData = new FormData();
        Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, value);
        });

        // S3 POST requires the 'file' field to be last
        formData.append("file", file);

        const uploadResponse = await fetch(url, {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Upload failed: ${errorText}`);
        }

        setProgress(100);

        const baseUrl = cloudFrontURL.endsWith("/")
          ? cloudFrontURL
          : `${cloudFrontURL}/`;
        const previewUrl = `${baseUrl}${uniquePath}`;

        const uploadedData: UploadedFileData = {
          filePath: uniquePath,
          fileName: file.name,
          fileType: getFileTypeFromMimeType(file.type),
          mimeType: file.type,
          size: file.size,
          previewUrl,
        };

        onSuccess?.(uploadedData);
        setIsUploading(false);
        return uploadedData;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Upload failed";
        setError(errorMessage);
        setIsUploading(false);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
        return null;
      }
    },
    [accessControl, folder, onSuccess, onError]
  );

  return {
    upload,
    isUploading,
    progress,
    error,
    reset,
  };
}

export default useS3Upload;
