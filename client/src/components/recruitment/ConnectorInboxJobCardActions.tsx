import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, MoreVertical, Share2, Upload, Users } from "lucide-react";
import {
  formatReferCandidateLabel,
  formatShareJobLabel,
} from "@/lib/recruitment/connector-job-action-labels";

interface ConnectorInboxJobCardActionsProps {
  referCount?: number;
  candidateCount: number;
  hasSharedLink?: boolean;
  onRefer?: () => void;
  onViewCandidates: () => void;
  onViewJobDetails?: () => void;
  onShare?: () => void;
}

export function ConnectorInboxJobCardActions({
  referCount = 0,
  candidateCount,
  hasSharedLink = false,
  onRefer,
  onViewCandidates,
  onViewJobDetails,
  onShare,
}: ConnectorInboxJobCardActionsProps) {
  const showMenu = Boolean(onViewJobDetails || onShare);
  const candidatesLabel =
    candidateCount > 0
      ? `View Candidates (${candidateCount})`
      : "View Candidates";

  return (
    <div className="flex items-center gap-2">
      {onRefer ? (
        <Button
          size="sm"
          onClick={onRefer}
          className="h-9 min-w-0 flex-1 gap-1.5 bg-brand-gradient font-semibold text-brand-foreground shadow-none hover:shadow-none"
        >
          <Upload className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {formatReferCandidateLabel(referCount)}
          </span>
        </Button>
      ) : null}

      <Button
        size="sm"
        variant="outline"
        onClick={onViewCandidates}
        className="h-9 min-w-0 flex-1 gap-2 border-brand-amethyst/30 bg-card font-semibold text-brand-amethyst shadow-none transition-all duration-200 hover:border-brand-amethyst hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
      >
        <Users className="h-4 w-4 shrink-0" />
        <span className="truncate">{candidatesLabel}</span>
      </Button>

      {showMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-label="More job actions"
              className="h-9 w-[42px] shrink-0 px-0"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[190px]">
            {onViewJobDetails ? (
              <DropdownMenuItem
                onClick={onViewJobDetails}
                className="gap-2.5 py-2"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span>Job Details</span>
              </DropdownMenuItem>
            ) : null}
            {onShare ? (
              <DropdownMenuItem onClick={onShare} className="gap-2.5 py-2">
                <Share2 className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{formatShareJobLabel()}</span>
                {hasSharedLink ? (
                  <Badge
                    variant="outline"
                    className="ml-auto shrink-0 border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[10px] font-semibold text-emerald-700"
                  >
                    Shared
                  </Badge>
                ) : null}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
