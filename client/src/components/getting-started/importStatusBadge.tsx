import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

export type ImportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | null;

export function GettingStartedImportStatusBadge({
  importStatus,
  importErrorMessage,
}: {
  importStatus: ImportStatus;
  importErrorMessage?: string | null;
}) {
  if (!importStatus) {
    return null;
  }

  const statusConfig = {
    pending: {
      label: "Queued",
      message: "Your contacts are in queue. We'll start importing shortly",
      icon: Clock,
      className:
        "bg-amber-100 text-amber-700 hover:bg-amber-700 hover:text-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-300 dark:hover:text-amber-900 border-amber-300 dark:border-amber-800",
      iconClassName: "text-amber-600 dark:text-amber-400",
    },
    processing: {
      label: "Importing...",
      message: "Importing your contacts… This may take a few moments",
      icon: Loader2,
      className:
        "bg-blue-100 text-blue-700 hover:bg-blue-700 hover:text-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-300 dark:hover:text-blue-900 border-blue-300 dark:border-blue-800",
      iconClassName: "text-blue-600 dark:text-blue-400 animate-spin",
    },
    completed: {
      label: "Complete",
      message: null as string | null,
      icon: CheckCircle2,
      className:
        "bg-green-100 text-green-700 hover:bg-green-700 hover:text-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-300 dark:hover:text-green-900 border-green-300 dark:border-green-800",
      iconClassName: "text-green-600 dark:text-green-400",
    },
    failed: {
      label: "Failed",
      message: null as string | null,
      icon: XCircle,
      className:
        "bg-red-100 text-red-700 hover:bg-red-700 hover:text-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-300 dark:hover:text-red-900 border-red-300 dark:border-red-800",
      iconClassName: "text-red-600 dark:text-red-400",
    },
  };

  const config = statusConfig[importStatus];
  const StatusIcon = config.icon;

  const badgeElement = (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium cursor-help", config.className)}
    >
      <StatusIcon className={cn("h-3 w-3 mr-1", config.iconClassName)} />
      {config.label}
    </Badge>
  );

  if (config.message) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">{badgeElement}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{config.message}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (importStatus === "failed" && importErrorMessage) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">{badgeElement}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{importErrorMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className)}
    >
      <StatusIcon className={cn("h-3 w-3 mr-1", config.iconClassName)} />
      {config.label}
    </Badge>
  );
}
