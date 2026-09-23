import { AlertCircle } from "lucide-react";
import { MAX_AI_RETRY_ATTEMPTS } from "@/constants/recruitmentRetry";
import { cn } from "@/lib/utils";

const UPLOAD_FAILURE_MESSAGES: Record<string, string> = {
  no_contact_info: "Could not extract contact info from resume",
  invalid_pdf: "Invalid or corrupted PDF file",
  file_too_large: "File exceeds 10MB limit",
  ai_extraction_failed: "We couldn't extract information from this resume.",
  contact_creation_failed: "Failed to create contact record",
  evaluation_failed: "Failed to evaluate against job",
  unknown: "We couldn't complete processing for this resume upload.",
};

function getUploadFailureMessage(reason: string | null): string {
  if (!reason) return "Processing failed";
  return UPLOAD_FAILURE_MESSAGES[reason] ?? reason;
}

interface UploadFailureNoticeProps {
  failureReason: string | null;
  retryCount: number;
  showRetryGuidance?: boolean;
  className?: string;
}

export function UploadFailureNotice({
  failureReason,
  retryCount,
  showRetryGuidance = true,
  className,
}: UploadFailureNoticeProps) {
  const canRetry = retryCount < MAX_AI_RETRY_ATTEMPTS;
  const remainingAttempts = MAX_AI_RETRY_ATTEMPTS - retryCount;

  return (
    <div
      className={cn(
        "flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2",
        className
      )}
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <div className="flex flex-col gap-1">
        <span>{getUploadFailureMessage(failureReason)}</span>
        {showRetryGuidance &&
          (canRetry ? (
            <span className="text-muted-foreground">
              Don&apos;t worry — you can try again by clicking the{" "}
              <strong>&quot;Retry&quot;</strong> button below. You have{" "}
              {remainingAttempts} attempt
              {remainingAttempts === 1 ? "" : "s"} remaining.
            </span>
          ) : (
            <span className="text-muted-foreground">
              All {MAX_AI_RETRY_ATTEMPTS} retry attempts have been used. If the
              issue persists, please reach out to our support team for further
              assistance.
            </span>
          ))}
      </div>
    </div>
  );
}
