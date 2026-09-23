import { useState } from "react";
import {
  ExternalLink,
  FileVideo,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { utcDayjs } from "@/lib/dayjs";
import {
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TYPE_LABELS,
} from "@/constants/feedback";
import type { FeedbackRequest } from "@/types/system-feedback";

interface MyFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedback: FeedbackRequest[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-rose-50 text-rose-700 border-rose-200",
  under_review: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-brand-rose/10 text-brand-rose border-brand-rose/20",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-orange-50 text-orange-700",
  critical: "bg-rose-50 text-rose-700",
};

const TYPE_STYLES: Record<string, string> = {
  bug: "bg-rose-50 text-rose-700 border-rose-200",
  feature: "bg-sky-50 text-sky-700 border-sky-200",
  ui_ux: "bg-brand-amethyst/10 text-brand-amethyst border-brand-amethyst/25",
  general: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function FeedbackAttachment({
  media,
}: {
  media: NonNullable<FeedbackRequest["media"]>[number];
}) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const isImage =
    media.fileType === "image" || media.mimeType?.startsWith("image/");
  const isVideo =
    media.fileType === "video" || media.mimeType?.startsWith("video/");

  return (
    <a
      href={media.filePath}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm transition-colors hover:border-brand-rose/40 hover:bg-brand-rose/5"
    >
      {isImage ? (
        <ImageIcon className="h-4 w-4 shrink-0 text-brand-rose" />
      ) : (
        <FileVideo className="h-4 w-4 shrink-0 text-brand-rose" />
      )}
      <span className="min-w-0 flex-1 truncate font-medium">
        {media.fileName}
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      {isImage && !previewFailed && (
        <img
          src={media.filePath}
          alt={media.fileName}
          className="ml-1 h-10 w-10 shrink-0 rounded object-cover border"
          onError={() => setPreviewFailed(true)}
        />
      )}
      {isVideo && !isImage && (
        <video
          src={media.filePath}
          className="ml-1 h-10 w-14 shrink-0 rounded object-cover border"
          muted
        />
      )}
    </a>
  );
}

function FeedbackCard({ item }: { item: FeedbackRequest }) {
  const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.new;
  const priorityStyle =
    PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.medium;
  const typeStyle = TYPE_STYLES[item.type] ?? TYPE_STYLES.general;

  return (
    <article className="group relative space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-brand-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="line-clamp-2 text-base font-medium leading-snug text-foreground transition-colors group-hover:text-brand-amethyst">
            {item.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            Submitted{" "}
            {utcDayjs(item.createdAt).local().format("DD MMM YYYY, h:mm A")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={cn("font-medium", statusStyle)}>
            {FEEDBACK_STATUS_LABELS[item.status] ?? item.status}
          </Badge>
          <Badge
            variant="secondary"
            className={cn("font-medium", priorityStyle)}
          >
            {FEEDBACK_PRIORITY_LABELS[item.priority] ?? item.priority}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className={cn("font-medium", typeStyle)}>
          {FEEDBACK_TYPE_LABELS[item.type] ?? item.type}
        </Badge>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
        {item.description}
      </p>

      {item.media && item.media.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Attachments ({item.media.length})
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {item.media.map((media) => (
              <FeedbackAttachment key={media.id} media={media} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export function MyFeedbackModal({
  open,
  onOpenChange,
  feedback,
  loading,
  error = null,
  onRetry,
}: MyFeedbackModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5 text-left">
          <DialogTitle>My Submitted Feedback</DialogTitle>
          <DialogDescription>
            Track the status of feedback you have submitted to our team.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-brand-rose" />
              <p className="text-sm">Loading your feedback...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
              <p className="text-sm font-medium text-foreground">
                Could not load your feedback
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              {onRetry && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onRetry}
                  className="mt-4 text-brand-rose hover:text-brand-rose"
                >
                  Try again
                </Button>
              )}
            </div>
          ) : feedback.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
              <p className="text-sm font-medium text-foreground">
                No feedback submitted yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your submitted bug reports, feature requests, and feedback will
                appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedback.map((item) => (
                <FeedbackCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
