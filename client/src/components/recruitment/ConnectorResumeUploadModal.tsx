import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useS3Upload } from "@/hooks/useS3Upload";
import { useConnectorUpload } from "@/hooks/useConnectorUpload";
import { type ConnectorResumeUploadFormValues } from "@/schemas/connector-resume-upload";
import { cn } from "@/lib/utils";
import {
  Upload,
  X,
  FileText,
  Loader2,
  CheckCircle2,
  Building2,
  AlertCircle,
  ClipboardList,
} from "lucide-react";
import type { ConnectorUploadResponse } from "@/lib/api/recruitment";

interface ConnectorResumeUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  jobCompany: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function ConnectorResumeUploadModal({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  jobCompany,
}: ConnectorResumeUploadModalProps) {
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [uploadResult, setUploadResult] =
    useState<ConnectorUploadResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { upload } = useS3Upload({ folder: "resumes", accessControl: "none" });
  const uploadMutation = useConnectorUpload();

  const { control, register, reset, setValue, getValues } =
    useForm<ConnectorResumeUploadFormValues>({
      defaultValues: { files: [], piiConsent: false },
    });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "files",
  });

  const watchedFiles = useWatch({ control, name: "files" });
  const watchedPiiConsent = useWatch({ control, name: "piiConsent" });

  const liveFileErrors = useMemo(() => {
    return (watchedFiles ?? []).map((f) => {
      if (!f) return null;
      const email = (f.email ?? "").trim();
      if (!email) return "Email is required";
      if (!EMAIL_REGEX.test(email)) return "Please enter a valid email";
      return null;
    });
  }, [watchedFiles]);

  const livePiiError = !watchedPiiConsent ? "Confirmation is required" : null;
  const hasLiveErrors =
    liveFileErrors.some((e) => e !== null) || livePiiError !== null;

  const resetAll = useCallback(() => {
    reset({ files: [], piiConsent: false });
    setUploadingIds(new Set());
    setSubmitAttempted(false);
    setUploadResult(null);
  }, [reset]);

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) resetAll();
      onOpenChange(isOpen);
    },
    [onOpenChange, resetAll]
  );

  const handleFilesSelected = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;

      const candidates: File[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (fields.length + candidates.length >= MAX_FILES) {
          toast({
            title: "Limit reached",
            description: `Maximum ${MAX_FILES} files per upload.`,
            variant: "destructive",
          });
          break;
        }
        if (file.type !== "application/pdf") {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a PDF file.`,
            variant: "destructive",
          });
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 10MB limit.`,
            variant: "destructive",
          });
          continue;
        }
        const isDuplicate = fields.some(
          (f) => f.fileName === file.name && f.size === file.size
        );
        if (isDuplicate) continue;
        candidates.push(file);
      }

      // Assign a stable client id per file so that removals (which reindex
      // useFieldArray entries) don't misroute in-flight uploads.
      const pairs = candidates.map((file) => ({
        file,
        clientId: newClientId(),
      }));

      pairs.forEach(({ file, clientId }) => {
        setUploadingIds((prev) => new Set(prev).add(clientId));
        append({
          clientId,
          fileName: file.name,
          filePath: "",
          mimeType: file.type,
          fileType: "pdf",
          size: file.size,
          email: "",
        });
      });

      await Promise.all(
        pairs.map(async ({ file, clientId }) => {
          try {
            const data = await upload(file);
            // Re-resolve the current index by clientId at the moment the
            // upload completes — by now the user may have removed earlier
            // rows, shifting this file's index.
            const currentFiles = getValues("files") ?? [];
            const liveIndex = currentFiles.findIndex(
              (f) => f?.clientId === clientId
            );
            if (liveIndex === -1) {
              // Row was removed while uploading — nothing to write.
              return;
            }
            if (data?.filePath) {
              setValue(`files.${liveIndex}.filePath`, data.filePath, {
                shouldDirty: true,
                shouldValidate: false,
              });
              setValue(
                `files.${liveIndex}.mimeType`,
                data.mimeType || file.type
              );
              setValue(`files.${liveIndex}.fileType`, data.fileType || "pdf");
              setValue(`files.${liveIndex}.size`, data.size ?? file.size);
            } else {
              toast({
                title: "Upload failed",
                description: `Could not upload ${file.name}. Remove and try again.`,
                variant: "destructive",
              });
            }
          } finally {
            setUploadingIds((prev) => {
              const next = new Set(prev);
              next.delete(clientId);
              return next;
            });
          }
        })
      );
    },
    [fields, append, upload, toast, setValue, getValues]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      void handleFilesSelected(e.dataTransfer.files);
    },
    [handleFilesSelected]
  );

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    const values = getValues();

    if (uploadingIds.size > 0) {
      toast({
        title: "Please wait",
        description: "Resumes are still uploading. Try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    if ((values.files ?? []).length === 0) {
      toast({
        title: "No resumes to submit",
        description: "Please upload at least one resume.",
        variant: "destructive",
      });
      return;
    }

    if (hasLiveErrors) {
      const firstError =
        liveFileErrors.find((err) => err !== null) ?? livePiiError ?? null;
      toast({
        title: "Please fix the highlighted fields",
        description: firstError ?? "Some fields require your attention.",
        variant: "destructive",
      });
      return;
    }

    const missingFilePath = values.files.some(
      (f) => !f.filePath || !f.filePath.trim()
    );
    if (missingFilePath) {
      toast({
        title: "Upload incomplete",
        description: "One or more resumes failed to upload. Remove and retry.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await uploadMutation.mutateAsync({
        jobId,
        piiConsent: true,
        files: values.files.map((f) => ({
          fileName: f.fileName,
          filePath: f.filePath,
          mimeType: f.mimeType,
          fileType: f.fileType,
          size: f.size,
          email: f.email.trim().toLowerCase(),
        })),
      });
      const failed = result.failed ?? [];
      const succeeded = result.succeeded ?? [];
      // All succeeded → skip results popup and go straight to pipeline
      if (failed.length === 0 && succeeded.length > 0) {
        toast({
          title: "Referral submitted",
          description: `${succeeded.length} resume${succeeded.length === 1 ? "" : "s"} ${succeeded.length === 1 ? "is" : "are"} being processed. Track progress in the job pipeline.`,
        });
        resetAll();
        onOpenChange(false);
        navigate(`/recruiting/refer-candidates/inbox/${jobId}`);
        return;
      }
      // Show popup only when at least one file failed
      setUploadResult(result);
    } catch (err) {
      const message = (err as { message?: string })?.message;
      toast({
        title: "Submission failed",
        description:
          message ||
          "Failed to submit resumes for processing. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResultOk = () => {
    const hasSuccess = (uploadResult?.succeeded?.length ?? 0) > 0;
    resetAll();
    onOpenChange(false);
    if (hasSuccess) {
      navigate(`/recruiting/refer-candidates/inbox/${jobId}`);
    }
  };

  const succeededItems = uploadResult?.succeeded ?? [];
  const failedItems = uploadResult?.failed ?? [];
  const showingResults = uploadResult != null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && showingResults) {
          handleResultOk();
          return;
        }
        handleClose(nextOpen);
      }}
    >
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        mobileFullscreen
        hideCloseButton
      >
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-6 text-white sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-3.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
              {showingResults ? (
                <ClipboardList className="h-5 w-5" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
                {showingResults ? "Upload results" : "Upload Resumes"}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="mt-1 flex items-center gap-1.5 text-[13px] text-white/90">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {jobTitle} @ {jobCompany}
                  </span>
                </div>
              </DialogDescription>
            </div>
          </div>
        </div>

        {showingResults ? (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {succeededItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Successful ({succeededItems.length})
                  </p>
                  {succeededItems.map((item) => (
                    <div
                      key={`${item.uploadJobId}-${item.email}`}
                      className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.fileName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {failedItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-destructive">
                    Failed ({failedItems.length})
                  </p>
                  {failedItems.map((item) => (
                    <div
                      key={`fail-${item.email}-${item.fileName}`}
                      className="flex items-start gap-2.5 rounded-xl border border-brand-destructive/25 bg-brand-destructive/5 p-3"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-destructive" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.fileName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.email}
                        </p>
                        <p className="mt-1 text-xs font-medium text-brand-destructive">
                          {item.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 justify-end border-t border-border bg-card p-4">
              <Button
                type="button"
                onClick={handleResultOk}
                className="w-full bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg sm:w-auto"
              >
                OK
              </Button>
            </div>
          </>
        ) : (
          <form
            onSubmit={handleFormSubmit}
            className="flex min-h-0 flex-1 flex-col"
            noValidate
          >
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <div
                role="button"
                tabIndex={0}
                aria-label="Upload resumes — drag and drop or browse files"
                className="cursor-pointer rounded-2xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-brand-amethyst/50 hover:bg-brand-amethyst/5 focus:outline-none focus-visible:border-brand-amethyst focus-visible:ring-2 focus-visible:ring-brand-amethyst/40"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Drag &amp; drop resumes or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF only, max 10MB each, up to {MAX_FILES} files
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => void handleFilesSelected(e.target.files)}
              />

              {fields.length > 0 && (
                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const watched = watchedFiles?.[index];
                    const clientId = watched?.clientId as string | undefined;
                    const isUploading = clientId
                      ? uploadingIds.has(clientId)
                      : false;
                    const liveError = liveFileErrors[index];
                    const showError = submitAttempted && !!liveError;
                    return (
                      <div
                        key={field.id}
                        className={cn(
                          "space-y-2 rounded-xl border border-border bg-muted/30 p-3 transition-colors",
                          showError &&
                            "border-brand-destructive bg-brand-destructive/5"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate text-sm font-medium">
                            {field.fileName}
                          </span>
                          {isUploading && (
                            <Loader2 className="h-4 w-4 animate-spin text-brand-sky" />
                          )}
                          {!isUploading && watchedFiles?.[index]?.filePath && (
                            <CheckCircle2 className="h-4 w-4 text-brand-success" />
                          )}
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="rounded p-0.5 hover:bg-muted"
                            disabled={isUploading}
                            aria-label="Remove file"
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>

                        <div className="space-y-1">
                          <Label
                            htmlFor={`email-${index}`}
                            className={cn(
                              "text-xs",
                              showError
                                ? "text-brand-destructive"
                                : "text-muted-foreground"
                            )}
                          >
                            Candidate email *
                          </Label>
                          <Input
                            id={`email-${index}`}
                            type="text"
                            inputMode="email"
                            autoComplete="email"
                            placeholder="candidate@example.com"
                            aria-invalid={showError ? true : undefined}
                            className={cn(
                              "h-8 text-sm",
                              showError &&
                                "border-brand-destructive focus-visible:ring-brand-destructive"
                            )}
                            {...register(`files.${index}.email` as const)}
                          />
                          {showError && (
                            <p className="text-xs font-medium text-brand-destructive">
                              {liveError}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-brand-warning/30 bg-brand-warning/10 p-3 transition-colors",
                  submitAttempted &&
                    livePiiError &&
                    "border-brand-destructive bg-brand-destructive/10"
                )}
              >
                <Controller
                  control={control}
                  name="piiConsent"
                  render={({ field }) => (
                    <Checkbox
                      id="pii-consent"
                      checked={field.value === true}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                      className={cn(
                        "mt-0.5 data-[state=checked]:border-transparent data-[state=checked]:bg-brand-gradient data-[state=checked]:text-white",
                        submitAttempted && livePiiError
                          ? "border-brand-destructive ring-1 ring-brand-destructive"
                          : "border-2 border-brand-amethyst bg-card"
                      )}
                    />
                  )}
                />
                <label
                  htmlFor="pii-consent"
                  className={cn(
                    "cursor-pointer text-sm leading-relaxed",
                    submitAttempted && livePiiError
                      ? "text-brand-destructive"
                      : "text-foreground/80"
                  )}
                >
                  I confirm I have permission to share each candidate&apos;s
                  information and understand they will be contacted for consent
                  before any introduction is made.
                </label>
              </div>
              {submitAttempted && livePiiError && (
                <p className="-mt-2 text-xs font-medium text-brand-destructive">
                  {livePiiError}
                </p>
              )}
            </div>

            <div className="flex shrink-0 gap-2 border-t border-border bg-card p-4 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploadMutation.isPending || uploadingIds.size > 0}
                className="flex-1 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg sm:flex-none"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Resume
                    {fields.length > 0 ? ` (${fields.length})` : ""}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
