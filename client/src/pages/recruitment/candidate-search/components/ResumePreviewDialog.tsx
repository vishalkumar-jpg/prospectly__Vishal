import {
  AlertCircle,
  ExternalLink,
  FileText,
  RefreshCw,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isHttpsUrl, isPdfFile } from "@/lib/url-utils";

export interface ResumePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string | null;
  resumeFileName: string | null;
  resumeUrl: string | null;
  loading: boolean;
  error?: unknown | null;
  onRetry?: () => void | Promise<unknown>;
}

export function ResumePreviewDialog({
  open,
  onOpenChange,
  candidateName,
  resumeFileName,
  resumeUrl,
  loading,
  error,
  onRetry,
}: ResumePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="flex-shrink-0 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50">
              <FileText className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {resumeFileName || "Resume"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Resume preview for {candidateName ?? "candidate"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col bg-slate-100">
          {loading && !resumeUrl ? (
            <div className="flex h-full items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading resume…
            </div>
          ) : resumeUrl &&
            isHttpsUrl(resumeUrl) &&
            isPdfFile(resumeUrl, resumeFileName) ? (
            <iframe
              src={`${resumeUrl}#toolbar=0`}
              className="h-full w-full border-0"
              title="Resume Preview"
              referrerPolicy="no-referrer"
            />
          ) : resumeUrl ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Shield className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Preview Restricted
                </h3>
                <p className="mx-auto mb-6 max-w-xs text-sm text-slate-500">
                  For security reasons, this file type cannot be previewed
                  directly. You can open it safely in a new tab.
                </p>
                {isHttpsUrl(resumeUrl) ? (
                  <Button asChild variant="outline" className="gap-2">
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Resume Safely
                    </a>
                  </Button>
                ) : (
                  <Button disabled variant="outline" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Open Resume Safely
                  </Button>
                )}
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Failed to load resume
                </h3>
                <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                  An error occurred while retrieving the resume. Please try
                  again.
                </p>
              </div>
              {onRetry ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await onRetry();
                    } catch (err) {
                      // eslint-disable-next-line no-console
                      console.error("Failed to retry loading resume:", err);
                    }
                  }}
                  className="mt-2 gap-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try again
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              No resume available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
