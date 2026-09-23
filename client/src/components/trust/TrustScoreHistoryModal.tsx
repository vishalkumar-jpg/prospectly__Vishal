import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Shield, X } from "lucide-react";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { toUTC } from "@/lib/dayjs";

interface TrustScoreHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Evidence {
  // Introduction details (enriched from backend)
  introductionTitle?: string;
  requesterName?: string;
  prospectName?: string;
  requestId?: string;

  // Feedback details (enriched from backend)
  feedbackRating?: number;
  feedbackText?: string;
  feedbackFromUser?: string;
  feedbackId?: string;

  // Peer review details
  reviewCount?: number;
  averageRating?: number;
  minReviews?: number;
  minAvgRating?: number;

  // Contact import details
  contactCount?: number;

  // Response rate details
  averageQuickRate?: number;
  average48hRate?: number;
  quickResponses?: number;
  responsesWithin48h?: number;
  totalResponses?: number;
  quickResponseThreshold?: number;
  minAvgResponse?: number;

  // Deduction details
  reason?: string;
  currentAvgRate?: number;
  minAvgThreshold?: number;
  netPointsBeforeDeduction?: number;

  // Legacy/fallback
  title?: string;
  action?: string;
  triggeredBy?: string;

  [key: string]: unknown;
}

interface HistoryItem {
  id: number;
  ruleId: number;
  ruleName: string;
  ruleSlug?: string;
  previousScore: number;
  newScore: number;
  pointsChange: number;
  actionType: string;
  evidence: Evidence | null;
  triggeredAt: string;
}

// Helper function to get a human-readable description based on rule slug
function renderResponseWithin48hDetail({
  evidence,
  isPointsAdded,
}: {
  evidence: Evidence | null;
  isPointsAdded: boolean;
}): React.ReactNode {
  const rate = evidence?.average48hRate ?? evidence?.currentAvgRate ?? 0;
  const requiredRate =
    evidence?.minAvgResponse ?? evidence?.minAvgThreshold ?? 85;
  if (isPointsAdded) {
    return (
      <div className="space-y-1">
        <div className="font-medium text-emerald-700 dark:text-emerald-400">
          Response time bonus earned!
        </div>
        <div className="text-sm text-muted-foreground">
          Your response rate: {rate.toFixed(1)}%
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="font-medium text-red-600 dark:text-red-400">
        Response rate dropped below threshold
      </div>
      <div className="text-sm text-muted-foreground">
        Your response rate: {rate.toFixed(1)}%
      </div>
      <div className="text-sm text-muted-foreground">
        Required: {requiredRate}%+ response rate
      </div>
    </div>
  );
}

function renderResponseRateDroppedDetail({
  evidence,
}: {
  evidence: Evidence;
}): React.ReactNode {
  return (
    <div className="space-y-1">
      <div className="font-medium text-red-600 dark:text-red-400">
        Response rate dropped below threshold
      </div>
      <div className="text-sm text-muted-foreground">
        Your response rate: {evidence.currentAvgRate?.toFixed(1)}%
      </div>
      <div className="text-sm text-muted-foreground">
        Required: {evidence.minAvgThreshold}%+ response rate
      </div>
    </div>
  );
}

function isPeerReviewRuleMatch({
  ruleSlug,
  evidence,
}: {
  ruleSlug: string;
  evidence: Evidence | null;
}): boolean {
  return (
    ruleSlug === "positive_peer_reviews" ||
    evidence?.reason === "peer_feedback_threshold_met" ||
    evidence?.reason === "peer_feedback_threshold_not_met"
  );
}

function renderPeerReviewDetail({
  evidence,
  isPointsAdded,
}: {
  evidence: Evidence | null;
  isPointsAdded: boolean;
}): React.ReactNode {
  const reviewCount = evidence?.reviewCount ?? 0;
  const avgRating = evidence?.averageRating ?? 0;
  const minReviews = evidence?.minReviews ?? 2;
  const minAvgRating = evidence?.minAvgRating ?? 4;
  if (isPointsAdded) {
    return (
      <div className="space-y-1">
        <div className="font-medium text-emerald-700 dark:text-emerald-400">
          Threshold achieved!
        </div>
        <div className="text-sm text-muted-foreground">
          You have {reviewCount} reviews with {avgRating.toFixed(1)} avg rating
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="font-medium text-red-600 dark:text-red-400">
        Threshold no longer met
      </div>
      <div className="text-sm text-muted-foreground">
        Current: {reviewCount} reviews with {avgRating.toFixed(1)} avg rating
      </div>
      <div className="text-sm text-muted-foreground">
        Required: {minReviews}+ reviews with {minAvgRating}+ avg rating
      </div>
    </div>
  );
}

function renderContactImportDetail({
  evidence,
  ruleSlug,
}: {
  evidence: Evidence;
  ruleSlug: string;
}): React.ReactNode {
  const sourceMap: Record<string, string> = {
    google_contact_import: "Google Contacts",
    microsoft_contact_import: "Microsoft Contacts",
    apple_contact_import: "Apple Contacts",
    csv_manual_upload: "CSV Upload",
    linkedin_zip_import: "LinkedIn Import",
  };
  const sourceName = sourceMap[ruleSlug] || "Contacts";
  return (
    <div className="space-y-1">
      <div className="font-medium text-slate-900 dark:text-slate-100">
        Imported {evidence.contactCount} contacts
      </div>
      <div className="text-sm text-muted-foreground">Source: {sourceName}</div>
    </div>
  );
}

function renderIntroductionDetail({
  evidence,
}: {
  evidence: Evidence;
}): React.ReactNode {
  return (
    <div className="space-y-1">
      <div className="font-medium text-slate-900 dark:text-slate-100">
        {evidence.introductionTitle}
      </div>
      {evidence.requesterName && (
        <div className="text-sm text-muted-foreground">
          Requester: {evidence.requesterName}
        </div>
      )}
      {evidence.prospectName && (
        <div className="text-sm text-muted-foreground">
          Prospect: {evidence.prospectName}
        </div>
      )}
    </div>
  );
}

function renderFeedbackDetail({
  evidence,
}: {
  evidence: Evidence;
}): React.ReactNode {
  return (
    <div className="space-y-1">
      <div className="font-medium text-slate-900 dark:text-slate-100">
        Received {evidence.feedbackRating}/5 rating
      </div>
      <div className="text-sm text-muted-foreground">
        From: {evidence.feedbackFromUser}
      </div>
      {evidence.feedbackText && (
        <div className="text-sm text-muted-foreground italic truncate max-w-[200px]">
          "{evidence.feedbackText}"
        </div>
      )}
    </div>
  );
}

function getDetailDescription(item: HistoryItem): React.ReactNode {
  const evidence = item.evidence;
  const ruleSlug = item.ruleSlug || "";
  const isPointsAdded = item.pointsChange > 0;

  if (ruleSlug === "response_within_48h") {
    return renderResponseWithin48hDetail({ evidence, isPointsAdded });
  }

  if (evidence?.reason === "avg_response_rate_dropped") {
    return renderResponseRateDroppedDetail({ evidence });
  }

  if (isPeerReviewRuleMatch({ ruleSlug, evidence })) {
    return renderPeerReviewDetail({ evidence, isPointsAdded });
  }

  if (evidence?.contactCount !== undefined) {
    return renderContactImportDetail({ evidence, ruleSlug });
  }

  if (evidence?.introductionTitle) {
    return renderIntroductionDetail({ evidence });
  }

  if (evidence?.feedbackRating !== undefined && evidence?.feedbackFromUser) {
    return renderFeedbackDetail({ evidence });
  }

  // Generic rule-based descriptions for common rules
  const ruleDescriptions: Record<string, { added: string; removed: string }> = {
    phone_verified: {
      added: "Phone number verified successfully",
      removed: "Phone verification removed",
    },
    linkedin_oauth_connected: {
      added: "LinkedIn account connected",
      removed: "LinkedIn connection removed",
    },
    high_success_rate: {
      added: "Maintained high success rate",
      removed: "Success rate dropped below threshold",
    },
  };

  if (ruleSlug && ruleDescriptions[ruleSlug]) {
    const desc = ruleDescriptions[ruleSlug];
    return (
      <span
        className={
          isPointsAdded
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400"
        }
      >
        {isPointsAdded ? desc.added : desc.removed}
      </span>
    );
  }

  // Fallback - show friendly description based on action type
  if (isPointsAdded) {
    return (
      <span className="text-emerald-700 dark:text-emerald-400">
        Points earned
      </span>
    );
  } else {
    return (
      <span className="text-red-600 dark:text-red-400">Points deducted</span>
    );
  }
}

export function TrustScoreHistoryModal({
  isOpen,
  onClose,
}: TrustScoreHistoryModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data, isLoading, isError, isFetching } = useQuery<{
    history: HistoryItem[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>({
    queryKey: ["/api/trust-score/me/history", currentPage, itemsPerPage],
    queryFn: async () => {
      const result = await api.trustScore.getMyHistory(
        itemsPerPage,
        (currentPage - 1) * itemsPerPage
      );
      return result;
    },
    enabled: isOpen,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Reset to page 1 when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
    }
  }, [isOpen]);

  // Extract history and pagination from response
  const history = data?.history || [];
  const pagination = data?.pagination;

  // Use empty array as fallback during loading
  const displayHistory = isLoading || isFetching ? [] : history;

  // Use pagination data from backend
  const totalPages = pagination?.totalPages || 1;
  const hasNextPage = pagination?.hasNextPage || false;
  const hasPrevPage = pagination?.hasPrevPage || false;

  // Generate visible page numbers (show first, last, current, and neighbors)
  const getVisiblePages = () => {
    const pages: number[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Show pages around current page
      if (currentPage > 3) {
        pages.push(-1); // Ellipsis marker
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push(-1); // Ellipsis marker
      }

      // Always show last page if we know it exists
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        mobileFullscreen
        hideCloseButton
      >
        {/* Hero */}
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-6 text-white sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-3.5 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
                Trust Score History
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-relaxed text-white/90">
                A detailed log of events that have impacted your trust score.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto overflow-x-auto p-5 sm:p-6">
            <Table className="w-full max-sm:min-w-[680px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="max-sm:w-[96px] max-sm:px-2">
                    Date
                  </TableHead>
                  <TableHead className="max-sm:w-[160px] max-sm:px-2">
                    Action
                  </TableHead>
                  <TableHead className="max-sm:min-w-[220px] max-sm:px-2">
                    Details
                  </TableHead>
                  <TableHead className="text-right max-sm:w-[96px] max-sm:px-2">
                    Score Change
                  </TableHead>
                  <TableHead className="text-right max-sm:w-[80px] max-sm:px-2">
                    New Score
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || isFetching ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : displayHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      {isError
                        ? "Failed to load history."
                        : "No history found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayHistory.map((item: HistoryItem, index: number) => (
                    <TableRow key={`${item.id}-${item.triggeredAt}-${index}`}>
                      <TableCell className="whitespace-nowrap max-sm:px-2 max-sm:py-3">
                        {formatLocalizedShortDateTime(toUTC(item.triggeredAt))}
                      </TableCell>
                      <TableCell className="font-medium max-sm:min-w-[160px] max-sm:px-2 max-sm:py-3">
                        {item.ruleName}
                      </TableCell>
                      <TableCell className="max-sm:min-w-[220px] max-sm:px-2 max-sm:py-3">
                        {getDetailDescription(item)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap max-sm:px-2 max-sm:py-3">
                        <Badge
                          variant={
                            item.pointsChange > 0 ? "default" : "destructive"
                          }
                          className={cn(
                            item.pointsChange > 0 &&
                              "bg-emerald-100 text-emerald-800 hover:bg-emerald-800 hover:text-emerald-100 dark:bg-emerald-900 dark:text-emerald-200 dark:hover:bg-emerald-200 dark:hover:text-emerald-900 hover:bg-emerald-900 hover:text-emerald-200"
                          )}
                        >
                          {item.pointsChange > 0
                            ? `+${item.pointsChange.toFixed(1)}`
                            : item.pointsChange.toFixed(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap max-sm:px-2 max-sm:py-3">
                        {item.newScore.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination Controls */}
          {displayHistory.length > 0 && (
            <div className="flex shrink-0 items-center justify-center border-t border-border bg-card p-4 sm:justify-end">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      className={cn(
                        !hasPrevPage || isLoading || isFetching
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                      )}
                    />
                  </PaginationItem>

                  {/* Page Numbers */}
                  {getVisiblePages().map((page, index) => {
                    if (page === -1) {
                      return (
                        <PaginationItem key={`ellipsis-${index}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }

                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className={cn(
                            "cursor-pointer hover:bg-brand-amethyst/10 hover:text-brand-amethyst",
                            "aria-[current=page]:border-transparent aria-[current=page]:bg-brand-gradient aria-[current=page]:text-brand-foreground aria-[current=page]:shadow-brand-cta aria-[current=page]:hover:text-brand-foreground"
                          )}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      className={cn(
                        !hasNextPage || isLoading || isFetching
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
