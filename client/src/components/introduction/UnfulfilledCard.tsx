import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { AccountDeletedInfo } from "./AccountDeletedInfo";
import { formatLastActivity } from "@/utils/dateFormatting";
import { formatDistanceToNow } from "date-fns";
import { toUTC } from "@/lib/dayjs";
import {
  UnfulfilledRequest,
  FAILURE_REASON_LABELS,
  FAILURE_STAGE_LABELS,
} from "./UnfulfilledTab.types";

interface UnfulfilledCardProps {
  item: UnfulfilledRequest;
  expandedCards: Set<string>;
  setExpandedCards: React.Dispatch<React.SetStateAction<Set<string>>>;
  onOpenDetails: (item: UnfulfilledRequest, e: React.MouseEvent) => void;
}

export function UnfulfilledCard({
  item,
  expandedCards,
  setExpandedCards,
  onOpenDetails,
}: UnfulfilledCardProps) {
  const isExpanded = expandedCards.has(item.id);
  const relativeTime = formatDistanceToNow(toUTC(item.createdAt), {
    addSuffix: true,
  });

  const toggleCardExpansion = (itemId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  return (
    <Card
      key={item.id}
      className={`group flex flex-col transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] border-2 overflow-hidden hover:border-red-400/40 ${
        isExpanded ? "min-h-[260px]" : ""
      }`}
    >
      <CardHeader className="relative pb-4 pt-2 px-3 bg-transparent border-b border-red-200/40 transition-colors duration-200 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/50 via-orange-500/50 to-red-500/50 z-10"></div>

        {(item.meetingTitle || item.meetingDescription) && (
          <div className="mb-4 mt-2 px-3">
            {item.meetingTitle && (
              <div
                className="text-base font-bold text-foreground mb-2 leading-tight line-clamp-2"
                title={item.meetingTitle}
              >
                {item.meetingTitle}
              </div>
            )}
            {item.meetingDescription && (
              <div className="relative">
                <div className="text-xs text-foreground line-clamp-2 overflow-hidden leading-relaxed">
                  {item.meetingDescription}
                </div>
                <div className="flex justify-end mt-1">
                  <button
                    onClick={(e) => onOpenDetails(item, e)}
                    className="text-xs font-medium underline bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent hover:opacity-80"
                    data-testid={`button-view-more-${item.id}`}
                  >
                    View more
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-stretch justify-center gap-3 mb-4 mt-2">
          <div className="w-full px-4 py-3 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-slate-900/50 dark:to-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 text-center">
              Referral Payout
            </div>
            <div className="flex items-center justify-center gap-1">
              <DollarSign className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
                {(item.bountyAmount || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 items-stretch mt-4">
          <div className="w-full relative py-4 px-5 bg-gradient-to-br from-blue-50/60 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/40 flex flex-col min-h-[140px] rounded-lg">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600/70 dark:text-blue-400/70 mb-3 text-center">
              Requester
            </div>
            {item.requesterName &&
            item.requesterName !== "User's Account deleted" &&
            item.requesterName !== "Unknown" ? (
              <>
                <div className="flex flex-col items-center gap-2.5 mb-3 w-full">
                  <PremiumAvatar
                    name={item.requesterName || "Unknown"}
                    size="sm"
                    imageUrl={item.requesterPhotoUrl}
                  />
                  <div className="font-bold text-sm leading-tight text-center w-full px-2 flex flex-col items-center gap-1">
                    <div className="flex items-center justify-center gap-1">
                      {item.requesterName || "Unknown"}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-blue-200/40 dark:border-blue-700/40 w-full px-2">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-blue-600/60 dark:text-blue-400/60" />
                    <span className="text-center w-full break-words">
                      {item.requesterCompany || "Unknown Company"}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center">
                <AccountDeletedInfo variant="blue" className="w-full" />
              </div>
            )}
          </div>

          <div className="w-full relative py-4 px-5 bg-gradient-to-br from-purple-50/60 to-purple-50/30 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/40 flex flex-col min-h-[140px] rounded-lg">
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600/70 dark:text-purple-400/70 mb-3 text-center">
              Prospect
            </div>
            {item.targetName &&
            item.targetName !== "User's Account deleted" &&
            item.targetName !== "Unknown" ? (
              <>
                <div className="flex flex-col items-center gap-2.5 mb-3 w-full">
                  <PremiumAvatar
                    name={item.targetName || "Unknown"}
                    size="sm"
                    imageUrl={item.targetPhotoUrl}
                  />
                  <div className="font-bold text-sm leading-tight text-center w-full px-2 flex flex-col items-center gap-1">
                    <div className="flex items-center justify-center gap-1">
                      {item.targetName || "Unknown"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground mt-auto pt-3 border-t border-purple-200/40 dark:border-purple-700/40 w-full px-2">
                  <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-purple-600/60 dark:text-purple-400/60" />
                  <span className="text-center w-full break-words">
                    {item.targetCompany || "Unknown Company"}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center">
                <AccountDeletedInfo variant="purple" className="w-full" />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 mt-4">
          <button
            onClick={(e) => toggleCardExpansion(item.id, e)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 h-9 w-full rounded-lg bg-gradient-to-r from-red-50 to-orange-50/80 hover:from-red-100 hover:to-orange-100 text-slate-700 border border-red-200/60 hover:border-red-300/80 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01] font-semibold cursor-pointer dark:from-red-950/30 dark:to-orange-950/20 dark:text-slate-300 dark:border-red-800/40 dark:hover:from-red-900/40 dark:hover:to-orange-900/30"
            aria-label={isExpanded ? "Collapse card" : "Expand card"}
            data-testid={`button-expand-unfulfilled-${item.id}`}
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300 flex-shrink-0" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300 flex-shrink-0" />
            )}
            <span className="text-xs text-slate-700 dark:text-slate-300 leading-none">
              {isExpanded ? "Collapse" : "Expand"}
            </span>
          </button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-red-600 border-red-200 dark:text-red-400 dark:border-red-700"
            >
              {FAILURE_STAGE_LABELS[item.failureStage] || item.failureStage}
            </Badge>
          </div>

          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 border border-red-200/50 dark:border-red-800/40">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {FAILURE_REASON_LABELS[item.failureReason] || item.failureReason}
            </p>
            {item.failureNotes && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {item.failureNotes}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t border-border/50">
            <AlertCircle className="h-3 w-3 text-amber-500" />
            <span>
              Marked unfulfilled:{" "}
              {formatLastActivity(item.createdAt, relativeTime)}
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
