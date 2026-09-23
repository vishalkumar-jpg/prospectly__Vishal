import { useState } from "react";
import { Upload, FileText, CheckCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getApplyJobResumeFieldError } from "@/schemas/recruitment-apply-job";

interface ResumeUploadFieldProps {
  file: File | undefined;
  onChange: (file: File | undefined) => void;
  error: string | undefined;
}

export function ResumeUploadField({
  file,
  onChange,
  error,
}: ResumeUploadFieldProps) {
  const [fileError, setFileError] = useState<string | undefined>(undefined);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const validationError = getApplyJobResumeFieldError(selected);
    if (validationError) {
      setFileError(validationError);
      onChange(undefined);
      return;
    }

    setFileError(undefined);
    onChange(selected);
  };

  const displayError = fileError ?? error;

  return (
    <div className="space-y-2">
      <Label htmlFor="resume-upload" className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-slate-500" />
        Resume{" "}
        <span className="text-destructive" aria-hidden>
          *
        </span>
      </Label>
      <div className="relative">
        <input
          id="resume-upload"
          type="file"
          accept=".pdf"
          onChange={handleChange}
          aria-describedby={displayError ? "resume-upload-error" : undefined}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
            file
              ? "border-brand-amethyst/30 bg-brand-amethyst/5"
              : displayError
                ? "border-destructive hover:border-destructive/90"
                : "border-slate-200 hover:border-brand-amethyst/40"
          )}
        >
          {file ? (
            <div className="flex items-center justify-center gap-2 w-full min-w-0 px-2 overflow-hidden">
              <FileText className="h-5 w-5 text-brand-amethyst flex-shrink-0" />
              <span
                className="text-sm font-medium text-brand-amethyst truncate block max-w-[180px] sm:max-w-[260px]"
                title={file.name}
              >
                {file.name}
              </span>
              <CheckCircle className="h-4 w-4 text-brand-amethyst flex-shrink-0" />
            </div>
          ) : (
            <>
              <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1" />
              <p className="text-sm text-slate-600">
                Drop your resume here or click to upload
              </p>
              <p className="text-xs text-slate-400">PDF (max 10MB)</p>
            </>
          )}
        </div>
      </div>
      {displayError && (
        <p id="resume-upload-error" className="text-sm font-medium text-destructive">{displayError}</p>
      )}
    </div>
  );
}
