import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  TrendingUp,
  Eye,
  Send,
  Calendar,
  CalendarCheck,
  MessageSquare,
  AlertCircle,
  RefreshCcw,
  Archive,
} from "lucide-react";
import { labelRequesterArchiveReason } from "@/components/introduction/introductionHelpers";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { utcDayjs } from "@/lib/dayjs";
import { ClaimTrackingModal } from "./ClaimTrackingModal";

interface SharerClaim {
  claimId: string;
  introductionRequestId: string;
  claimerId: string;
  status: string;
  claimerShare: number | null;
  sharerShare: number | null;
  createdAt: string;
  verificationCompletedAt: string | null;
  claimedAt: string | null;
  contactName: string;
  bountyAmount: number;
  requestStatus: string;
  requesterArchiveReason?: string | null;
  requesterArchiveNotes?: string | null;
  requesterArchivedAt?: string | null;
}

// Helper function to format status labels
const formatStatus = (status: string) => {
  if (!status) return "";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Get status config for introduction request statuses
const getRequestStatusConfig = (requestStatus: string) => {
  const stageConfig: Record<
    string,
    { label: string; icon: typeof Clock; className: string }
  > = {
    pending: {
      label: "Pending",
      icon: Clock,
      className:
        "bg-slate-500/15 text-slate-700 hover:bg-slate-700 hover:text-slate-50 dark:text-slate-400 border-slate-500/30",
    },
    accepted: {
      label: "Accepted",
      icon: CheckCircle2,
      className:
        "bg-blue-500/15 text-blue-700 hover:bg-blue-700 hover:text-blue-50 dark:text-blue-400 border-blue-500/30",
    },
    declined: {
      label: "Declined",
      icon: XCircle,
      className:
        "bg-red-500/15 text-red-700 hover:bg-red-700 hover:text-red-50 dark:text-red-400 border-red-500/30",
    },
    intro_sent: {
      label: "Intro Sent",
      icon: Send,
      className:
        "bg-cyan-500/15 text-cyan-700 hover:bg-cyan-700 hover:text-cyan-50 dark:text-cyan-400 border-cyan-500/30",
    },
    meeting_scheduled: {
      label: "Scheduled",
      icon: Calendar,
      className:
        "bg-indigo-500/15 text-indigo-700 hover:bg-indigo-700 hover:text-indigo-50 dark:text-indigo-400 border-indigo-500/30",
    },
    meeting_booked: {
      label: "Meeting Booked",
      icon: CalendarCheck,
      className:
        "bg-purple-500/15 text-purple-700 hover:bg-purple-700 hover:text-purple-50 dark:text-purple-400 border-purple-500/30",
    },
    meeting_completed: {
      label: "Meeting Done",
      icon: CheckCircle2,
      className:
        "bg-teal-500/15 text-teal-700 hover:bg-teal-700 hover:text-teal-50 dark:text-teal-400 border-teal-500/30",
    },
    peer_feedback: {
      label: "Feedback",
      icon: MessageSquare,
      className:
        "bg-orange-500/15 text-orange-700 hover:bg-orange-700 hover:text-orange-50 dark:text-orange-400 border-orange-500/30",
    },
    completed: {
      label: "Completed",
      icon: CheckCircle2,
      className:
        "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-700 hover:text-emerald-50 dark:text-emerald-400 border-emerald-500/30",
    },
    email_failed: {
      label: "Email Failed",
      icon: AlertCircle,
      className:
        "bg-red-500/15 text-red-700 hover:bg-red-700 hover:text-red-50 dark:text-red-400 border-red-500/30",
    },
    meeting_rescheduled: {
      label: "Rescheduled",
      icon: RefreshCcw,
      className:
        "bg-amber-500/15 text-amber-700 hover:bg-amber-700 hover:text-amber-50 dark:text-amber-400 border-amber-500/30",
    },
    archived: {
      label: "Archived",
      icon: Archive,
      className:
        "bg-slate-500/15 text-slate-700 hover:bg-slate-700 hover:text-slate-50 dark:text-slate-400 border-slate-500/30",
    },
  };

  const config = stageConfig[requestStatus] || {
    label: formatStatus(requestStatus),
    icon: Clock,
    className:
      "bg-slate-500/15 text-slate-700 hover:bg-slate-700 hover:text-slate-50 dark:text-slate-400 border-slate-500/30",
  };

  return config;
};

const getStatusConfig = (claimStatus: string, requestStatus?: string) => {
  // For completed or failed claims, show the introduction request status instead
  if (
    (claimStatus === "completed" || claimStatus === "failed") &&
    requestStatus
  ) {
    return getRequestStatusConfig(requestStatus);
  }

  // Otherwise, show claim status
  switch (claimStatus) {
    case "completed":
      return {
        label: "Completed",
        icon: CheckCircle2,
        className:
          "bg-green-100 text-green-700 hover:bg-green-700 hover:text-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-400 dark:hover:text-green-900",
      };
    case "verified":
      return {
        label: "Verified",
        icon: CheckCircle2,
        className:
          "bg-emerald-100 text-emerald-700 hover:bg-emerald-700 hover:text-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-400 dark:hover:text-emerald-900",
      };
    case "verifying":
      return {
        label: "Verifying",
        icon: Loader2,
        className:
          "bg-blue-100 text-blue-700 hover:bg-blue-700 hover:text-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-400 dark:hover:text-blue-900",
      };
    case "pending":
      return {
        label: "Pending",
        icon: Clock,
        className:
          "bg-amber-100 text-amber-700 hover:bg-amber-700 hover:text-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-400 dark:hover:text-amber-900",
      };
    case "failed":
      return {
        label: "Failed",
        icon: XCircle,
        className:
          "bg-red-100 text-red-700 hover:bg-red-700 hover:text-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-400 dark:hover:text-red-900",
      };
    default:
      return {
        label: claimStatus,
        icon: Clock,
        className:
          "bg-slate-100 text-slate-700 hover:bg-slate-700 hover:text-slate-100 dark:bg-slate-800 dark:text-slate-400",
      };
  }
};

function ClaimCard({
  claim,
  onViewDetails,
  isHighlighted = false,
}: {
  claim: SharerClaim;
  onViewDetails: () => void;
  isHighlighted?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const statusConfig = getStatusConfig(claim.status, claim.requestStatus);
  const StatusIcon = statusConfig.icon;
  const isCompleted = claim.status === "completed";
  const hasArchiveDetails = Boolean(
    claim.requesterArchiveReason?.trim() ||
      claim.requesterArchiveNotes?.trim()
  );

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  return (
    <Card
      ref={cardRef}
      id={`sharer-claim-${claim.claimId}`}
      className={cn(
        "border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-colors",
        isHighlighted &&
          "border-primary ring-2 ring-primary/30 shadow-md shadow-primary/10"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
              {claim.contactName}
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Introduction Request
            </p>
          </div>
          <Badge
            className={cn("flex items-center gap-1", statusConfig.className)}
          >
            <StatusIcon
              className={cn(
                "h-3 w-3",
                claim.status === "verifying" && "animate-spin"
              )}
            />
            {statusConfig.label}
          </Badge>
        </div>

        {hasArchiveDetails && (
          <div className="mb-4 rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Withdrawal details
            </p>
            {claim.requesterArchiveReason?.trim() ? (
              <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                {labelRequesterArchiveReason(claim.requesterArchiveReason)}
              </p>
            ) : null}
            {claim.requesterArchiveNotes?.trim() ? (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                {claim.requesterArchiveNotes.trim()}
              </p>
            ) : null}
            {claim.requesterArchivedAt ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Withdrawn{" "}
                {utcDayjs(claim.requesterArchivedAt).local().format("MMM D, YYYY")}
              </p>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
              <DollarSign className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Referral Payout</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                $
                {typeof claim.bountyAmount === "number"
                  ? claim.bountyAmount
                  : Number(claim.bountyAmount || 0)}
              </p>
            </div>
          </div>

          {claim.sharerShare && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Your Earnings</p>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  $
                  {typeof claim.sharerShare === "number"
                    ? claim.sharerShare.toFixed(2)
                    : Number(claim.sharerShare || 0).toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Claimed on {utcDayjs(claim.createdAt).local().format("MMM D, YYYY")}
            {isCompleted && claim.claimedAt && (
              <>
                {" "}
                • Completed{" "}
                {utcDayjs(claim.claimedAt).local().format("MMM D, YYYY")}
              </>
            )}
          </p>
          {claim.requestStatus === "intro_sent" && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="gap-2"
              aria-label="View claim details"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 -m-4"></div>
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md">
          <Users className="h-10 w-10 text-white" />
        </div>
      </div>
      <h3 className="text-2xl font-bold mb-2 text-foreground">No Claims Yet</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        When someone claims a deal you've shared, it will appear here. Share
        deals to start earning!
      </p>
    </div>
  );
}

export function SharerClaimsTab({
  highlightedClaimId,
}: {
  highlightedClaimId?: string;
} = {}) {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [selectedContactName, setSelectedContactName] = useState<string>("");

  const {
    data: claims,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sharer-claims"],
    queryFn: () => api.marketplace.getSharerClaims(),
  });

  const handleViewDetails = (claim: SharerClaim) => {
    setSelectedClaimId(claim.introductionRequestId);
    setSelectedContactName(claim.contactName);
  };

  const handleCloseModal = () => {
    setSelectedClaimId(null);
    setSelectedContactName("");
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="py-8 text-center">
          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load claims. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!claims || claims.length === 0) {
    return <EmptyState />;
  }

  // Calculate summary stats
  const completedClaims = claims.filter((c) => c.status === "completed");
  const totalEarnings = completedClaims.reduce(
    (sum, c) =>
      sum +
      (typeof c.sharerShare === "number"
        ? c.sharerShare
        : Number(c.sharerShare || 0)),
    0
  );

  return (
    <>
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {claims.length}
              </p>
              <p className="text-xs text-slate-500">Total Claims</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {completedClaims.length}
              </p>
              <p className="text-xs text-slate-500">Completed</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                $
                {typeof totalEarnings === "number"
                  ? totalEarnings.toFixed(0)
                  : Number(totalEarnings || 0).toFixed(0)}
              </p>
              <p className="text-xs text-slate-500">Total Earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Claims List */}
        <div className="space-y-4">
          {claims.map((claim) => (
            <ClaimCard
              key={claim.claimId}
              claim={claim}
              isHighlighted={highlightedClaimId === claim.claimId}
              onViewDetails={() => handleViewDetails(claim)}
            />
          ))}
        </div>
      </div>

      {/* Claim Tracking Modal */}
      {selectedClaimId && (
        <ClaimTrackingModal
          open={!!selectedClaimId}
          onOpenChange={(open) => {
            if (!open) handleCloseModal();
          }}
          introductionRequestId={selectedClaimId}
          contactName={selectedContactName}
        />
      )}
    </>
  );
}

export default SharerClaimsTab;
