import {
  useState,
  useRef,
  useEffect,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, FileText, X, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { jobExtractionFileSchema, JOB_EXTRACTION_MAX_SIZE } from "./validation";

function getDropzoneClassName({
  busy,
  isDragActive,
  uploadSuccess,
}: {
  busy: boolean;
  isDragActive: boolean;
  uploadSuccess: boolean;
}) {
  if (busy) {
    return "border-brand-amethyst/30 bg-brand-amethyst/5 cursor-wait";
  }
  if (isDragActive) {
    return "border-brand-amethyst bg-brand-amethyst/10 cursor-copy";
  }
  if (uploadSuccess) {
    return "border-brand-success bg-brand-success/10 cursor-pointer";
  }
  return "border-brand-amethyst/40 cursor-pointer hover:border-brand-amethyst hover:bg-brand-amethyst/5 bg-background";
}

function getUploadPromptLabel({
  masterDataLoading,
  isParsing,
  isDragActive,
}: {
  masterDataLoading: boolean;
  isParsing: boolean;
  isDragActive: boolean;
}) {
  if (masterDataLoading) return "Loading options...";
  if (isParsing) return "Extracting...";
  if (isDragActive) return "Drop your PDF here";
  return "Click or drag and drop your PDF";
}

function notifyExtractionBlocked({
  toast,
  masterDataUnavailable,
  masterDataError,
  isParsing,
  alertOnParsingOnly,
}: {
  toast: (props: {
    title: string;
    description?: string;
    variant?: "destructive";
  }) => void;
  masterDataUnavailable: boolean;
  masterDataError: Error | null | undefined;
  isParsing: boolean;
  alertOnParsingOnly: boolean;
}) {
  if (!masterDataUnavailable && isParsing && !alertOnParsingOnly) return;
  toast({
    title: masterDataError ? "Data load error" : "Please wait",
    description: masterDataError
      ? "Could not load job options. Please retry."
      : isParsing
        ? "Extraction is already in progress."
        : "Loading job options. Try again in a moment.",
    variant: "destructive",
  });
}

function renderUploadedFileRow({
  uploadedFile,
  isParsing,
  uploadSuccess,
  onClear,
}: {
  uploadedFile: File;
  isParsing: boolean;
  uploadSuccess: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      {isParsing ? (
        <Loader2 className="h-6 w-6 text-brand-amethyst animate-spin" />
      ) : uploadSuccess ? (
        <CheckCircle className="h-6 w-6 text-brand-success" />
      ) : (
        <FileText className="h-6 w-6 text-brand-amethyst" />
      )}
      <div className="flex flex-col items-center gap-1">
        <span className="font-medium text-center max-w-md truncate">
          {uploadedFile.name}
        </span>
      </div>
      {!isParsing && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClear();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function renderEmptyUploadPrompt({
  isDragActive,
  masterDataLoading,
  isParsing,
}: {
  isDragActive: boolean;
  masterDataLoading: boolean;
  isParsing: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Upload
        className={cn(
          "h-8 w-8 transition-colors",
          isDragActive ? "text-brand-amethyst" : "text-muted-foreground"
        )}
      />
      <div className="flex flex-col items-center gap-1 text-center">
        <span
          className={cn(
            "font-medium",
            isDragActive ? "text-brand-amethyst" : "text-muted-foreground"
          )}
        >
          {getUploadPromptLabel({ masterDataLoading, isParsing, isDragActive })}
        </span>
        <span className="text-sm text-muted-foreground">
          Maximum file size:{" "}
          {(JOB_EXTRACTION_MAX_SIZE / 1024 / 1024).toFixed(0)} MB
        </span>
      </div>
    </div>
  );
}

interface FileExtractionCardProps {
  isParsing: boolean;
  masterDataUnavailable: boolean;
  masterDataLoading: boolean;
  masterDataError: Error | null | undefined;
  onRunExtraction: (file: File) => void;
}

export default function FileExtractionCard({
  isParsing,
  masterDataUnavailable,
  masterDataLoading,
  masterDataError,
  onRunExtraction,
}: FileExtractionCardProps) {
  const { toast } = useToast();
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const busy = isParsing || masterDataUnavailable;

  const processSelectedFile = (file: File) => {
    if (isParsing || masterDataUnavailable) {
      notifyExtractionBlocked({
        toast,
        masterDataUnavailable,
        masterDataError,
        isParsing,
        alertOnParsingOnly: false,
      });
      return;
    }

    const result = jobExtractionFileSchema.safeParse(file);
    if (!result.success) {
      toast({
        title: "Invalid file",
        description: result.error.issues[0].message,
        variant: "destructive",
      });
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadedFile(file);
    setUploadSuccess(true);
    onRunExtraction(file);

    // Reset success state after animation using ref-held timer
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = setTimeout(() => {
      setUploadSuccess(false);
    }, 2000);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isParsing || masterDataUnavailable) return;
    dragDepthRef.current += 1;
    if (dragDepthRef.current === 1) setIsDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragActive(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragActive(false);

    if (isParsing || masterDataUnavailable) {
      notifyExtractionBlocked({
        toast,
        masterDataUnavailable,
        masterDataError,
        isParsing,
        alertOnParsingOnly: true,
      });
      return;
    }

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const handleDropzoneClick = () => {
    if (!busy && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (busy) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleDropzoneClick();
    }
  };

  return (
    <div className="w-full mt-8">
      <div
        className={cn(
          "border-2 border-dashed rounded-2xl p-10 transition-colors",
          getDropzoneClassName({ busy, isDragActive, uploadSuccess })
        )}
        tabIndex={0}
        role="button"
        aria-label="Upload job description PDF"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleDropzoneClick}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={fileInputRef}
          id="job-extraction-file"
          type="file"
          accept=".pdf"
          className="hidden"
          disabled={isParsing || masterDataUnavailable}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            processSelectedFile(file);
          }}
        />

        {uploadedFile
          ? renderUploadedFileRow({
              uploadedFile,
              isParsing,
              uploadSuccess,
              onClear: () => {
                setUploadedFile(null);
                setUploadSuccess(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
              },
            })
          : renderEmptyUploadPrompt({
              isDragActive,
              masterDataLoading,
              isParsing,
            })}
      </div>
    </div>
  );
}
