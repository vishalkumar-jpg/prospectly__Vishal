import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  X,
  Upload,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Bug,
  Send,
  MessageSquare,
  Loader2,
  Video,
  FileVideo,
  Image as ImageIcon,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { FEEDBACK_PRIORITIES, FEEDBACK_TYPES } from "@/constants/feedback";
import {
  useFeedbackRequests,
  type FeedbackRequest,
} from "@/hooks/useFeedbackRequests";
import { useS3Upload, type UploadedFileData } from "@/hooks/useS3Upload";
import { MyFeedbackModal } from "@/components/feedback/MyFeedbackModal";

interface FeedbackSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onHasDataChange?: (hasData: boolean) => void;
  resetTrigger?: number;
  openMyFeedbackModal?: boolean;
  onMyFeedbackModalOpened?: () => void;
}

function appendScreenshotPreview({
  file,
  index,
  setScreenshotPreviews,
}: {
  file: File;
  index: number;
  setScreenshotPreviews: React.Dispatch<React.SetStateAction<string[]>>;
}): void {
  const reader = new FileReader();
  reader.onload = (event) => {
    const dataUrl = event.target?.result as string;
    setScreenshotPreviews((prev) => {
      const next = [...prev];
      next[index] = dataUrl;
      return next;
    });
  };
  reader.readAsDataURL(file);
}

const FeedbackSidebar = ({
  isOpen,
  onClose,
  onHasDataChange,
  resetTrigger,
  openMyFeedbackModal = false,
  onMyFeedbackModalOpened,
}: FeedbackSidebarProps) => {
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuthGuard();
  const {
    createFeedback,
    submitting: feedbackSubmitting,
    feedback,
    loading: feedbackLoading,
    error: feedbackError,
    refetch,
  } = useFeedbackRequests();
  const { upload, isUploading: s3Uploading } = useS3Upload({
    folder: "system-feedback",
  });

  const submitting = feedbackSubmitting || s3Uploading;

  const [formData, setFormData] = useState({
    type: "" as FeedbackRequest["type"] | "",
    priority: FEEDBACK_PRIORITIES.MEDIUM as FeedbackRequest["priority"],
    title: "",
    description: "",
    currentPage: location.pathname,
  });

  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  const totalFilesCount = screenshots.length + videos.length;
  const uploadedMediaCount = totalFilesCount - uploadingFiles.size;

  const resetFormState = () => {
    setFormData({
      type: "",
      priority: FEEDBACK_PRIORITIES.MEDIUM,
      title: "",
      description: "",
      currentPage: location.pathname,
    });
    setScreenshots([]);
    setScreenshotPreviews([]);
    setVideos([]);
    setVideoPreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
  };

  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      resetFormState();
    }
  }, [resetTrigger]);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showMyFeedbackModal, setShowMyFeedbackModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      void refetch();
    }
  }, [isOpen, refetch]);

  useEffect(() => {
    if (!isOpen || !openMyFeedbackModal) return;
    setShowMyFeedbackModal(true);
    onMyFeedbackModalOpened?.();
  }, [isOpen, openMyFeedbackModal, onMyFeedbackModalOpened]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, currentPage: location.pathname }));
  }, [location.pathname]);

  const handlePriorityChange = (value: FeedbackRequest["priority"]) => {
    setFormData((prev) => ({ ...prev, priority: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newScreenshots: File[] = [];
      const newVideos: File[] = [];

      files.forEach((file) => {
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        if (isImage) {
          if (screenshots.length + newScreenshots.length >= 10) {
            toast({
              title: "Limit exceeded",
              description: "Maximum 10 screenshots allowed",
              variant: "destructive",
            });
            return;
          }
          if (file.size > 30 * 1024 * 1024) {
            toast({
              title: "File too large",
              description: `${file.name} exceeds 30MB`,
              variant: "destructive",
            });
            return;
          }
          newScreenshots.push(file);
        } else if (isVideo) {
          if (videos.length + newVideos.length >= 5) {
            toast({
              title: "Limit exceeded",
              description: "Maximum 5 videos allowed",
              variant: "destructive",
            });
            return;
          }
          if (file.size > 100 * 1024 * 1024) {
            toast({
              title: "File too large",
              description: `${file.name} exceeds 100MB`,
              variant: "destructive",
            });
            return;
          }
          newVideos.push(file);
        }
      });

      if (newScreenshots.length > 0) {
        setScreenshots((prev) => [...prev, ...newScreenshots]);
        const startIndex = screenshotPreviews.length;
        newScreenshots.forEach((file, idx) => {
          appendScreenshotPreview({
            file,
            index: startIndex + idx,
            setScreenshotPreviews,
          });
        });
      }

      if (newVideos.length > 0) {
        setVideos((prev) => [...prev, ...newVideos]);
        newVideos.forEach((file) => {
          const url = URL.createObjectURL(file);
          setVideoPreviews((prev) => [...prev, url]);
        });
      }
    }
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
    setScreenshotPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    if (videoPreviews[index]) {
      URL.revokeObjectURL(videoPreviews[index]);
    }
    setVideos((prev) => prev.filter((_, i) => i !== index));
    setVideoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (onHasDataChange) {
      const hasData =
        formData.title.trim().length > 0 ||
        formData.description.trim().length > 0 ||
        screenshots.length > 0 ||
        videos.length > 0;
      onHasDataChange(hasData);
    }
  }, [
    formData.title,
    formData.description,
    screenshots,
    videos,
    onHasDataChange,
  ]);

  const feedbackTypes = [
    {
      value: FEEDBACK_TYPES.BUG,
      label: "Bug Report",
      icon: Bug,
      selectedColor: "text-red-600",
      selectedBorder: "border-red-600",
      selectedBg: "bg-red-50 dark:bg-red-900/20",
    },
    {
      value: FEEDBACK_TYPES.FEATURE,
      label: "Feature Request",
      icon: Lightbulb,
      selectedColor: "text-amber-600",
      selectedBorder: "border-amber-600",
      selectedBg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      value: FEEDBACK_TYPES.GENERAL,
      label: "General Feedback",
      icon: CheckCircle,
      selectedColor: "text-green-600",
      selectedBorder: "border-green-600",
      selectedBg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      value: FEEDBACK_TYPES.UI_UX,
      label: "UI/UX Issue",
      icon: AlertCircle,
      selectedColor: "text-purple-600",
      selectedBorder: "border-purple-600",
      selectedBg: "bg-purple-50 dark:bg-purple-900/20",
    },
  ];

  const handleCloseAttempt = () => {
    const hasData =
      formData.title.trim().length > 0 ||
      formData.description.trim().length > 0 ||
      screenshots.length > 0 ||
      videos.length > 0;

    if (hasData) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  };

  const confirmDiscard = () => {
    resetFormState();
    setShowDiscardDialog(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to submit feedback.",
        variant: "destructive",
      });
      return;
    }

    if (
      !formData.type ||
      !formData.title.trim() ||
      !formData.description.trim()
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Step 1: Upload all files to S3
      const uploadedMedia: UploadedFileData[] = [];
      const allFiles = [...screenshots, ...videos];

      for (const file of allFiles) {
        setUploadingFiles((prev) => new Set(prev).add(file.name));
        const result = await upload(file);
        setUploadingFiles((prev) => {
          const next = new Set(prev);
          next.delete(file.name);
          return next;
        });

        if (result) {
          uploadedMedia.push(result);
        } else {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      // Step 2: Create feedback with media data
      await createFeedback({
        type: formData.type,
        priority: formData.priority,
        title: formData.title.trim(),
        description: formData.description.trim(),
        current_page: formData.currentPage,
        media: uploadedMedia.map((m) => ({
          module: "system_feedback",
          fileName: m.fileName,
          filePath: m.filePath,
          mimeType: m.mimeType,
          fileType: m.fileType,
          size: m.size,
        })),
      });

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      });

      resetFormState();
      onClose();
    } catch (error) {
      toast({
        title: "Submission Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(next) => {
        if (next) return; // only react to close
        if (submitting) return; // don't allow closing mid-submit
        handleCloseAttempt(); // existing discard-confirm logic
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md lg:max-w-lg !ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=open]:!duration-500 data-[state=closed]:!duration-300 will-change-transform"
      >
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
          {/* Loading Overlay */}
          {submitting && (
            <div className="absolute inset-0 z-[102] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-300">
              <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full animate-pulse" />
                </div>
                <div className="text-center px-6">
                  <p className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    {uploadingFiles.size > 0
                      ? `Uploading Files...`
                      : "Submitting Feedback"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {uploadingFiles.size > 0
                      ? "Please wait while we secure your files"
                      : "Thank you for helping us improve!"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto bg-app [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5">
            <div className="space-y-6 p-4 sm:p-6">
              {/* Hero Header */}
              <section className="relative overflow-hidden rounded-2xl bg-brand-hero-gradient p-5 text-white shadow-brand-card sm:p-7">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
                />
                <div className="relative flex items-center gap-3.5 pr-10">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-lg font-extrabold tracking-tight text-white sm:text-xl">
                      Feedback
                    </SheetTitle>
                    <SheetDescription asChild>
                      <div className="mt-1 text-[13px] leading-relaxed text-white/90">
                        Report a bug, request a feature, or share feedback —
                        automatically linked to your current page.
                      </div>
                    </SheetDescription>
                  </div>
                </div>
              </section>

              {/* Type & Priority */}
              <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
                {/* Feedback Type Selection */}
                <div className="space-y-2">
                  <Label htmlFor="type">
                    Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: value as FeedbackRequest["type"],
                      }))
                    }
                  >
                    <SelectTrigger id="type" className="w-full">
                      <SelectValue placeholder="Select feedback type" />
                    </SelectTrigger>
                    <SelectContent className="z-[102]">
                      {feedbackTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            <type.icon
                              className={cn("h-4 w-4", type.selectedColor)}
                            />
                            {type.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label htmlFor="priority">
                    Priority <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={handlePriorityChange}
                  >
                    <SelectTrigger id="priority" className="w-full">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent className="z-[102]">
                      <SelectItem value={FEEDBACK_PRIORITIES.LOW}>
                        Low - Minor issue or non-urgent suggestion
                      </SelectItem>
                      <SelectItem value={FEEDBACK_PRIORITIES.MEDIUM}>
                        Medium - Standard improvement or bug fix
                      </SelectItem>
                      <SelectItem value={FEEDBACK_PRIORITIES.HIGH}>
                        High - Significant issue affecting experience
                      </SelectItem>
                      <SelectItem value={FEEDBACK_PRIORITIES.CRITICAL}>
                        Critical - Urgent blocker or system failure
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </section>

              {/* Title & Description */}
              <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Brief summary..."
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.title.length}/100
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Please provide detailed information about your feedback..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.description.length}/1000
                  </p>
                </div>
              </section>

              {/* Media Upload */}
              <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-6">
                {/* Screenshots section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium">Screenshots</Label>
                    </div>
                    <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      {screenshots.length}/10
                    </span>
                  </div>

                  {screenshots.length < 10 && (
                    <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-4 text-center hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer relative group">
                      <input
                        type="file"
                        multiple
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={submitting}
                      />
                      <Upload className="h-5 w-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                      <p className="text-[11px] text-muted-foreground group-hover:text-primary transition-colors font-medium">
                        Drop screenshots
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        (max 10, 30MB each)
                      </p>
                    </div>
                  )}

                  {screenshotPreviews.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {screenshotPreviews.map((preview, index) => (
                        <div
                          key={index}
                          className="relative rounded-lg overflow-hidden border group aspect-video bg-muted/50"
                        >
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8 rounded-full shadow-lg"
                              onClick={() => removeScreenshot(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Videos section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium">Videos</Label>
                    </div>
                    <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      {videos.length}/5
                    </span>
                  </div>

                  {videos.length < 5 && (
                    <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-4 text-center hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer relative group">
                      <input
                        type="file"
                        multiple
                        accept="video/mp4, video/quicktime, video/x-m4v, video/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={submitting}
                      />
                      <Upload className="h-5 w-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                      <p className="text-[11px] text-muted-foreground group-hover:text-primary transition-colors font-medium">
                        Drop videos
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        (max 5, 100MB each)
                      </p>
                    </div>
                  )}

                  {videoPreviews.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {videoPreviews.map((preview, index) => (
                        <div
                          key={index}
                          className="relative rounded-lg overflow-hidden border group aspect-video bg-muted/50"
                        >
                          <video
                            src={preview}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <FileVideo className="h-8 w-8 text-white opacity-50" />
                          </div>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8 rounded-full shadow-lg"
                              onClick={() => removeVideo(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t bg-background">
            <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setShowMyFeedbackModal(true)}
                className="w-full sm:w-auto"
              >
                <History className="h-4 w-4 mr-2" />
                My Feedback
                {feedback.length > 0 && (
                  <span className="ml-2 rounded-full bg-brand-rose/10 px-2 py-0.5 text-xs font-semibold text-brand-rose">
                    {feedback.length}
                  </span>
                )}
              </Button>
              <Button
                type="submit"
                disabled={
                  submitting ||
                  authLoading ||
                  !formData.type ||
                  !formData.title ||
                  !formData.description
                }
                className="w-full sm:w-auto group bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        <AlertDialog
          open={showDiscardDialog}
          onOpenChange={setShowDiscardDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard Feedback?</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes. Are you sure you want to discard them?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDiscard}
                className="bg-red-600 hover:bg-red-700"
              >
                Discard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <MyFeedbackModal
          open={showMyFeedbackModal}
          onOpenChange={setShowMyFeedbackModal}
          feedback={feedback}
          loading={feedbackLoading}
          error={feedbackError}
          onRetry={() => void refetch()}
        />
      </SheetContent>
    </Sheet>
  );
};

export default FeedbackSidebar;
