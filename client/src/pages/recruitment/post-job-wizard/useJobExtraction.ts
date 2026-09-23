import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import type { ExtractedJobData } from "@/lib/api/recruitment";
import type { UpdateJobFormData } from "./types";
import {
  useIndustries,
  useDepartments,
} from "@/hooks/useRecruitmentMasterData";
import { buildExtractedFormUpdates } from "./build-extracted-form-updates";
import { jobExtractionUrlInputSchema } from "./validation";

const SENSITIVE_ERROR_PATTERNS = [
  /api\s*key/i,
  /invalid.*key/i,
  /authentication/i,
  /unauthorized/i,
  /credential/i,
  /permission denied/i,
  /quota/i,
  /billing/i,
  /gemini/i,
];

function sanitizeDisplayedError(message: string, fallback: string): string {
  const trimmed = message.trim();
  if (!trimmed) return fallback;
  if (SENSITIVE_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return fallback;
  }
  return trimmed;
}

function getMessageFromErrorData(data: object): string | undefined {
  if (!("message" in data)) return undefined;
  const message = (data as { message: unknown }).message;
  if (typeof message === "string" && message.trim()) return message;
  if (Array.isArray(message) && message.length > 0) return message.join(", ");
  return undefined;
}

function getMessageFromErrorObject(error: object): string | undefined {
  if ("data" in error) {
    const data = (error as { data: unknown }).data;
    if (typeof data === "object" && data !== null) {
      const fromData = getMessageFromErrorData(data);
      if (fromData) return fromData;
    }
  }

  if (
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();
    if (message) return message;
  }

  return undefined;
}

function getErrorMessage(error: unknown, fallback: string): string {
  let message = fallback;
  if (error && typeof error === "object") {
    const fromObject = getMessageFromErrorObject(error);
    if (fromObject) message = fromObject;
  } else if (typeof error === "string" && error.trim()) {
    message = error;
  }
  return sanitizeDisplayedError(message, fallback);
}

interface UseJobExtractionOptions {
  updateFormData: UpdateJobFormData;
  sourceUrl: string;
  onExtractionComplete?: () => void;
  onExtractionBusyChange?: (busy: boolean) => void;
}

export interface UseJobExtractionReturn {
  isParsing: boolean;
  busy: boolean;
  masterDataLoading: boolean;
  masterDataError: Error | null | undefined;
  masterDataUnavailable: boolean;
  industriesError: Error | null | undefined;
  departmentsError: Error | null | undefined;
  refetchIndustries: () => void;
  refetchDepartments: () => void;
  runExtraction: (file: File) => Promise<void>;
  runUrlExtraction: () => Promise<void>;
}

export function useJobExtraction({
  updateFormData,
  sourceUrl,
  onExtractionComplete,
  onExtractionBusyChange,
}: UseJobExtractionOptions): UseJobExtractionReturn {
  const { toast } = useToast();
  const [isParsing, setIsParsing] = useState(false);

  const {
    industries,
    loading: industriesLoading,
    error: industriesError,
    refetch: refetchIndustries,
  } = useIndustries();
  const {
    departments,
    loading: departmentsLoading,
    error: departmentsError,
    refetch: refetchDepartments,
  } = useDepartments();

  const masterDataLoading = industriesLoading || departmentsLoading;
  const masterDataError = industriesError || departmentsError;
  const masterDataUnavailable = masterDataLoading || !!masterDataError;

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    onExtractionBusyChange?.(isParsing);
  }, [isParsing, onExtractionBusyChange]);

  useEffect(() => {
    return () => {
      onExtractionBusyChange?.(false);
    };
  }, [onExtractionBusyChange]);

  const applyExtracted = (extracted: ExtractedJobData) => {
    updateFormData((prev) =>
      buildExtractedFormUpdates(prev, extracted, industries, departments)
    );
  };

  const masterDataToast = () => {
    toast({
      title: masterDataError ? "Data load error" : "Please wait",
      description: masterDataError
        ? "Could not load job options. Please retry."
        : "Loading job options. Try again in a moment.",
      variant: "destructive",
    });
  };

  const runExtraction = async (file: File) => {
    if (masterDataUnavailable) {
      masterDataToast();
      return;
    }
    setIsParsing(true);
    try {
      const extracted = await api.recruitment.extractJobFromFile(file);
      if (!isMountedRef.current) return;
      applyExtracted(extracted);
      toast({
        title: "Job details extracted",
        description:
          "Your job details have been extracted. Review and continue.",
      });
      onExtractionComplete?.();
    } catch (error) {
      if (!isMountedRef.current) return;

      const errorMessage = getErrorMessage(
        error,
        "We couldn't extract the job details from this file. Please try a different file or enter the details manually."
      );

      toast({
        title: "Couldn't extract job details",
        description: errorMessage,
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      if (isMountedRef.current) setIsParsing(false);
    }
  };

  const runUrlExtraction = async () => {
    if (masterDataUnavailable) {
      masterDataToast();
      return;
    }
    const parsed = jobExtractionUrlInputSchema.safeParse(sourceUrl);
    if (!parsed.success) {
      toast({
        title: "Invalid URL",
        description:
          parsed.error.issues[0]?.message ?? "Check the URL and try again.",
        variant: "destructive",
      });
      return;
    }
    const url = parsed.data;
    if (!url) return;

    setIsParsing(true);
    try {
      const extracted = await api.recruitment.extractJobFromUrl(url);
      if (!isMountedRef.current) return;
      applyExtracted(extracted);
      toast({
        title: "Job details extracted",
        description:
          "Your job details have been extracted. Review and continue.",
      });
      onExtractionComplete?.();
    } catch (error) {
      if (!isMountedRef.current) return;

      const errorMessage = getErrorMessage(
        error,
        "We couldn't extract the job details from this URL. Please try a different URL or enter the details manually."
      );

      toast({
        title: "Couldn't extract job details",
        description: errorMessage,
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      if (isMountedRef.current) setIsParsing(false);
    }
  };

  return {
    isParsing,
    busy: isParsing || masterDataUnavailable,
    masterDataLoading,
    masterDataError,
    masterDataUnavailable,
    industriesError,
    departmentsError,
    refetchIndustries,
    refetchDepartments,
    runExtraction,
    runUrlExtraction,
  };
}
