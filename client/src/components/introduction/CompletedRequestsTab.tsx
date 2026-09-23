import { useState, useEffect, useRef } from "react";
import {
  shouldShowConnectorPool,
  type PotentialConnectorsSummary,
} from "./introductionHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Archive } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toUTC } from "@/lib/dayjs";
import { RequestDetailsModal } from "./RequestDetailsModal";
import { BountyTransactionModal } from "./BountyTransactionModal";
import { ReviewsDialog } from "./ReviewsDialog";
import { ArchiveCard, type CompletedIntroduction } from "./ArchiveCard";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { IntroductionEmailLinkParams } from "@/types/introduction-deep-link";
interface RequestedIntroduction {
  id: string;
  prospectName: string;
  prospectCompany: string;
  prospectPhotoUrl?: string | null;
  connectorName: string | null;
  potentialConnectors?: PotentialConnectorsSummary | null;
  connectorCompany: string;
  connectorId?: string;
  requesterPhotoUrl?: string | null;
  bountyAmount: number;
  providerFee?: number;
  processingFee?: number;
  totalAmount?: number;
  stage:
    | "request_accepted"
    | "intro_sent"
    | "response_received"
    | "meeting_booked"
    | "meeting_completed"
    | "peer_feedback"
    | "archived";
  lastActivity: string;
  lastActivityTimestamp?: string;
  nextAction: string;
  progress: number;
  meetingDate?: string;
  rating?: number;
  feedbackComments?: string;
  purpose: string;
  meetingTitle?: string | null;
  meetingDescription?: string | null;
  requesterArchived?: boolean;
  requesterArchiveReason?: string | null;
  requesterArchiveNotes?: string | null;
  requesterArchivedAt?: string | null;
}
interface CompletedRequestsTabProps {
  search?: string;
  emailLinkParams?: IntroductionEmailLinkParams | null;
  onEmailLinkHandled?: () => void;
}
export function CompletedRequestsTab({
  search = "",
  emailLinkParams = null,
  onEmailLinkHandled,
}: CompletedRequestsTabProps) {
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<RequestedIntroduction | null>(null);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [selectedIntroForTransactions, setSelectedIntroForTransactions] =
    useState<CompletedIntroduction | null>(null);
  const [reviewsDialogOpen, setReviewsDialogOpen] = useState(false);
  const [selectedConnectorForReview, setSelectedConnectorForReview] = useState<{
    id?: string;
    name?: string;
    trustScore?: number;
  } | null>(null);
  const emailLinkHandledRef = useRef<string | null>(null);

  const handleViewReviews = (connector: {
    id?: string;
    name?: string;
    trustScore?: number;
  }) => {
    setSelectedConnectorForReview(connector);
    setReviewsDialogOpen(true);
  };
  const handleOpenFinance = (intro: CompletedIntroduction) => {
    setSelectedIntroForTransactions(intro);
    setTransactionModalOpen(true);
  };
  const handleOpenDetails = (
    intro: CompletedIntroduction,
    withdrawn: boolean
  ) => {
    const showConnectorPool = shouldShowConnectorPool({
      withdrawn,
      connectorId: intro.connectorId,
      connectorName: intro.connectorName,
      potentialConnectors: intro.potentialConnectors,
    });
    const archiveEventDate =
      withdrawn && intro.requesterArchivedAt
        ? intro.requesterArchivedAt
        : intro.completedDate;
    setSelectedRequest({
      id: intro.id,
      prospectName: intro.prospectName,
      prospectCompany: intro.prospectCompany,
      prospectPhotoUrl: intro.prospectPhotoUrl,
      connectorName: showConnectorPool ? null : intro.connectorName,
      connectorCompany: intro.connectorCompany,
      connectorId: intro.connectorId ?? undefined,
      requesterPhotoUrl: intro.connectorPhotoUrl,
      bountyAmount: Number(intro.bountyAmount),
      providerFee: Number(intro.providerFee ?? 0),
      processingFee: Number(intro.processingFee ?? 0),
      totalAmount: Number(intro.totalAmount ?? 0),
      potentialConnectors: intro.potentialConnectors,
      stage: (withdrawn
        ? "archived"
        : intro.stage || "peer_feedback") as RequestedIntroduction["stage"],
      lastActivity: formatDistanceToNow(toUTC(archiveEventDate), {
        addSuffix: true,
      }),
      lastActivityTimestamp: archiveEventDate,
      nextAction: withdrawn ? "Archived" : "Completed",
      progress: withdrawn ? 0 : 100,
      meetingDate: intro.completedDate,
      rating: intro.rating,
      feedbackComments: intro.feedbackComments,
      purpose: intro.purpose,
      meetingTitle: intro.meetingTitle,
      meetingDescription: intro.meetingDescription,
      requesterArchived: withdrawn,
      requesterArchiveReason: intro.requesterArchiveReason ?? null,
      requesterArchiveNotes: intro.requesterArchiveNotes ?? null,
      requesterArchivedAt: intro.requesterArchivedAt ?? null,
    });
    setDetailsModalOpen(true);
  };

  const searchParam = search.trim() || undefined;

  const { data: completedIntros = [], isLoading } = useQuery<
    CompletedIntroduction[]
  >({
    queryKey: [
      "/api/requester/introduction-requests/archive",
      { search: searchParam },
    ],
    queryFn: () => api.archive.getRequesterArchive({ search: searchParam }),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  // Normalize: derive "User's Account deleted" connectorName when account is gone.
  const normalizedIntros: CompletedIntroduction[] = completedIntros.map(
    (introData) => ({
      ...introData,
      connectorName:
        introData.connectorId === null &&
        !introData.connectorName &&
        introData.stage !== "archived"
          ? "User's Account deleted"
          : introData.connectorName,
    })
  );

  useEffect(() => {
    if (!emailLinkParams || isLoading) {
      return;
    }
    if (
      emailLinkParams.action === "acknowledge" ||
      emailLinkParams.action === "feedback" ||
      emailLinkParams.action === "review"
    ) {
      return;
    }
    if (emailLinkHandledRef.current === emailLinkParams.requestId) {
      return;
    }

    const intro = normalizedIntros.find(
      (item) => item.id === emailLinkParams.requestId
    );
    if (!intro) {
      return;
    }

    emailLinkHandledRef.current = emailLinkParams.requestId;
    handleOpenDetails(intro, !!intro.requesterArchived);
    onEmailLinkHandled?.();
  }, [emailLinkParams, isLoading, normalizedIntros, onEmailLinkHandled]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            className="h-[260px] w-full rounded-2xl bg-muted/60"
          />
        ))}
      </div>
    );
  }
  if (normalizedIntros.length === 0) {
    return (
      <Card className="rounded-2xl border border-border bg-card shadow-brand-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
            <Archive className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-base font-extrabold tracking-tight text-foreground">
            No introductions in your archive yet
          </h3>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            Completed introductions and ones you withdrew appear here. Withdrawn
            requests show the reason you provided.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-6">
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2 items-stretch">
          {normalizedIntros.map((intro) => (
            <ArchiveCard
              key={intro.id}
              intro={intro}
              onOpenFinance={handleOpenFinance}
              onOpenDetails={handleOpenDetails}
              onViewReviews={handleViewReviews}
            />
          ))}
        </div>
        <RequestDetailsModal
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          request={selectedRequest}
        />
        <BountyTransactionModal
          open={transactionModalOpen}
          onOpenChange={setTransactionModalOpen}
          introductionRequestId={selectedIntroForTransactions?.id || ""}
          prospectName={selectedIntroForTransactions?.prospectName}
        />
        <ReviewsDialog
          open={reviewsDialogOpen}
          onOpenChange={setReviewsDialogOpen}
          connectorName={selectedConnectorForReview?.name || "Connector"}
          trustScore={selectedConnectorForReview?.trustScore || 0}
          userId={selectedConnectorForReview?.id}
        />
      </div>
    </TooltipProvider>
  );
}
export type { CompletedIntroduction };
