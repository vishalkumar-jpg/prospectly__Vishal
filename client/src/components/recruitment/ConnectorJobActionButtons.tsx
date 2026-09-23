import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Share2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatReferCandidateLabel,
  formatShareJobLabel,
} from "@/lib/recruitment/connector-job-action-labels";

export interface ConnectorJobActionButtonsProps {
  referCount?: number;
  hasSharedLink?: boolean;
  onRefer?: () => void;
  onShare?: () => void;
  layout?: "card" | "inline" | "drawer" | "pipeline";
  className?: string;
  stopPropagation?: boolean;
}

function stopIfNeeded(
  event: React.MouseEvent | React.KeyboardEvent,
  stopPropagation?: boolean
) {
  if (stopPropagation) {
    event.stopPropagation();
  }
}

export function ConnectorJobActionButtons({
  referCount = 0,
  hasSharedLink = false,
  onRefer,
  onShare,
  layout = "card",
  className,
  stopPropagation = false,
}: ConnectorJobActionButtonsProps) {
  if (!onRefer && !onShare) return null;

  const referLabel = formatReferCandidateLabel(referCount);
  const shareLabel = formatShareJobLabel();

  const isCard = layout === "card";
  const isDrawer = layout === "drawer";
  const isPipeline = layout === "pipeline";

  return (
    <div
      className={cn(
        isCard
          ? "flex flex-wrap items-center gap-2 sm:justify-end"
          : isDrawer
            ? "flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start"
            : isPipeline
              ? "flex flex-wrap items-center justify-end gap-2"
              : "grid w-full grid-cols-2 gap-2",
        className
      )}
      onClick={(event) => stopIfNeeded(event, stopPropagation)}
      onKeyDown={(event) => stopIfNeeded(event, stopPropagation)}
    >
      {onRefer ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size={isDrawer ? "default" : "sm"}
                onClick={onRefer}
                className={cn(
                  isCard &&
                    "order-1 h-8 w-full gap-1.5 bg-brand-gradient font-semibold text-brand-foreground shadow-none transition-colors hover:shadow-none sm:order-none sm:w-auto",
                  isDrawer &&
                    "w-full gap-2 border border-brand-amethyst/25 bg-brand-amethyst/10 font-semibold text-brand-amethyst shadow-none transition-all hover:bg-brand-amethyst hover:text-white sm:w-auto",
                  isPipeline &&
                    "h-9 gap-1.5 bg-brand-gradient px-4 font-semibold text-brand-foreground shadow-none hover:shadow-none",
                  !isCard &&
                    !isDrawer &&
                    !isPipeline &&
                    "h-9 w-full gap-1.5 bg-brand-gradient font-semibold text-brand-foreground shadow-none hover:shadow-none"
                )}
              >
                {!isCard && <Upload className="h-4 w-4 shrink-0" />}
                {referLabel}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Upload a candidate&apos;s resume for this job</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}

      {onShare ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size={isDrawer ? "default" : "sm"}
                onClick={onShare}
                className={cn(
                  isCard &&
                    "order-3 h-8 flex-1 gap-1.5 sm:order-none sm:flex-initial",
                  isDrawer && "w-full sm:w-auto",
                  isPipeline && "h-9 gap-1.5 px-4",
                  !isCard && !isDrawer && !isPipeline && "h-9 w-full gap-1.5"
                )}
              >
                <Share2 className="h-4 w-4 shrink-0" />
                <span>{shareLabel}</span>
                {hasSharedLink ? (
                  <Badge
                    variant="outline"
                    className="ml-0.5 border-brand-success/30 bg-brand-success/10 px-1.5 py-0 text-[10px] font-semibold text-brand-success"
                  >
                    Shared
                  </Badge>
                ) : null}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {hasSharedLink
                  ? "You already generated a share link for this job"
                  : "Share this job on social media"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
}
