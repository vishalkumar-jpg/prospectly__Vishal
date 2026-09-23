import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import {
  useIntroductionDeepLink,
  useIntroductionDeepLinkLocal,
} from "@/hooks/introduction/use-introduction-deep-link";
import { isReviewDeepLink } from "@/hooks/introduction/deep-link.utils";
import { Inbox, AlertTriangle, RefreshCw } from "lucide-react";
import { AnyType } from "@/types/common";
import { canOpenReviewDialog, InboxRequest } from "./inboxUtils";
import { InboxCard } from "./InboxCard";
import { InboxDialogs } from "./InboxDialogs";
// import { InboxFilters } from "./InboxFilters";

interface InboxTabProps {
  refreshTrigger?: number;
  /** Debounced search string from parent (backend filter) */
  search?: string;
  emailLinkParams?: import("@/types/introduction-deep-link").IntroductionEmailLinkParams | null;
  onEmailLinkHandled?: () => void;
}

export function InboxTab({
  refreshTrigger,
  search = "",
  emailLinkParams = null,
  onEmailLinkHandled,
}: InboxTabProps) {
  const { currentUser } = useCurrentUser();
  const [isIntroDialogOpen, setIsIntroDialogOpen] = useState(false);
  const [isMakeIntroDialogOpen, setIsMakeIntroDialogOpen] = useState(false);
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<InboxRequest | null>(
    null
  );
  const [requestToDecline, setRequestToDecline] = useState<InboxRequest | null>(
    null
  );
  const [realRequests, setRealRequests] = useState<InboxRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [introSubject, setIntroSubject] = useState("");
  const [introMessage, setIntroMessage] = useState("");
  const [isAiAssisting, setIsAiAssisting] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  // Selected feedback state - currently not used but kept for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedFeedback, setSelectedFeedback] = useState<{
    feedback: Array<{ rating: number; comment: string; reviewer: string }>;
    requesterName: string;
  }>({ feedback: [], requesterName: "" });
  const [recommendedTemplate, setRecommendedTemplate] = useState<{
    template: string;
    effectivenessScore: number;
    contextMatch: string;
    performanceStats: {
      responseRate: number;
      meetingCompletionRate: number;
      avgQualityRating: number;
    };
    sampleSize: number;
  } | null>(null);
  // Loading recommendation state - currently not used but kept for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const { toast } = useToast();
  const [reviewsDialogOpen, setReviewsDialogOpen] = useState(false);
  const [selectedRequesterForReview, setSelectedRequesterForReview] = useState<{
    name?: string;
    trustScore?: number;
    current_trust_score?: number;
    id?: string;
  } | null>(null);
  const [emailTrackingModalOpen, setEmailTrackingModalOpen] = useState(false);
  const [selectedRequestForEmail, setSelectedRequestForEmail] = useState<
    string | null
  >(null);

  // Bounty revision state
  const [isBountyRevisionOpen, setIsBountyRevisionOpen] = useState(false);
  const [
    selectedRequestForBountyRevision,
    setSelectedRequestForBountyRevision,
  ] = useState<InboxRequest | null>(null);

  // Requester details popup state
  const [isRequesterPopupOpen, setIsRequesterPopupOpen] = useState(false);
  const [selectedRequesterDetails, setSelectedRequesterDetails] = useState<{
    requester: InboxRequest["requester"] | null;
    photoUrl: string | null;
  }>({ requester: null, photoUrl: null });

  // Mandatory Prospectly footer - cannot be edited
  const prospectlyFooter = `\n\nP.S. This introduction was facilitated through Prospectly, where professionals exchange warm introductions. ${currentUser?.full_name?.split(" ")[0] || "Your connector"} thought you'd be a great fit for the network.`;

  const previousUserIdRef = useRef<string | null>(null);
  // Track if a fetch is currently in progress to prevent concurrent requests
  const isFetchingRef = useRef(false);

  // Fetch real introduction requests from Express API
  const fetchRequests = useCallback(async () => {
    if (!currentUser) return;

    // Prevent concurrent fetch requests (guards against double API calls)
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;

    setIsLoading(true);
    setHasError(false);
    try {
      // Use centralized API request which includes proactive token refresh
      const responseData = await api.introductions.inbox({
        search: search.trim() || undefined,
      });

      // Map API data to UI format with proper requester names
      const mappedRequests = (responseData || []).map(
        (req: AnyType): InboxRequest => {
          const emailFallback = req.requester?.email
            ? String(req.requester.email).split("@")[0]
            : "";
          const requesterName =
            req.requester === null
              ? "User's Account deleted"
              : req.requester?.fullName ||
                `${req.requester?.firstName || ""} ${req.requester?.lastName || ""}`.trim() ||
                emailFallback ||
                "Unknown User";
          return {
            ...req,
            requesterName,
            targetName:
              `${req.contact?.firstName || ""} ${req.contact?.lastName || ""}`.trim(),
            // Snake_case fields for UI compatibility
            meeting_description: req.meetingDescription,
            meeting_title: req.meetingTitle,
            additional_context: req.additionalContext,
            bounty_amount: parseFloat(String(req.bountyAmount || "0")),
            // Meeting duration is now derived from scheduled_meetings (if needed) or falls back to requester's default
            meeting_duration: req.requester?.defaultDuration || "30min",
            created_at: req.createdAt, // Map createdAt to created_at for compatibility
            status: req.status,
            // Contact nested object with snake_case - include profilePhotoUrl
            contact: {
              ...req.contact,
              first_name: req.contact?.firstName,
              last_name: req.contact?.lastName,
              jobTitle: req.contact?.jobTitle,
              linkedin: req.contact?.linkedinUrl,
              websiteUrl: req.contact?.websiteUrl,
              profilePhotoUrl: req.contact?.profilePhotoUrl || null,
              companyLinkedinUrl: req.contact?.companyLinkedinUrl,
              organizations: req.contact?.organizations ?? [],
            } as InboxRequest["contact"],
            // Requester nested object with snake_case - include profilePhotoUrl and new fields
            requester: {
              ...req.requester,
              full_name: req.requester?.fullName,
              first_name: req.requester?.firstName,
              last_name: req.requester?.lastName,
              jobTitle: req.requester?.jobTitle,
              industry: req.requester?.industry,
              bio: req.requester?.bio,
              websiteUrl: req.requester?.websiteUrl,
              linkedinUrl: req.requester?.linkedinUrl,
              linkedin_id: req.requester?.linkedinUrl, // For backward compatibility
              current_trust_score: req.requester?.trustScore || 0,
              trustScore: req.requester?.trustScore || 0,
              profilePhotoUrl: req.requester?.profilePhotoUrl || null,
              organizations: req.requester?.organizations || [],
            } as InboxRequest["requester"],
            // CamelCase compatibility fields for legacy code
            bountyAmount: parseFloat(String(req.bountyAmount || "0")),
            meetingTitle: req.meetingTitle,
            additionalContext: req.additionalContext,
            description: req.meetingDescription,
            requestReason: req.meetingDescription,
            requesterTitle:
              req.requester?.jobTitle || req.requester?.company || "",
            requesterCompany: req.requester?.company || "",
            requesterEmail: req.requester?.email || "",
            targetCompany: req.contact?.company || "",
            targetTitle: req.contact?.jobTitle || "",
            targetLinkedIn: req.contact?.linkedinUrl || "",
            requesterDefaultDuration: req.requester?.defaultDuration || "30min",
            // Bounty validation fields
            connectorBountyAmount: req.connectorBountyAmount,
            requesterBountyAmount: req.requesterBountyAmount,
            canAccept: req.canAccept,
            // Entry status for potential connector requests
            entryStatus: req.entryStatus,
            // Top-level photo URLs for PremiumAvatar consistency
            requesterPhotoUrl: req.requester?.profilePhotoUrl || null,
            contactPhotoUrl: req.contact?.profilePhotoUrl || null,
            // Meeting date information
            meetingDate: req.meetingDate || null,
            meetingStartTime: req.meetingStartTime || null,
          };
        }
      );

      setRealRequests(mappedRequests);
    } catch {
      setHasError(true);
      toast({
        title: "Error",
        description: "Failed to load inbox requests. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [currentUser, search, toast]);

  const isNonReviewInboxLink =
    Boolean(emailLinkParams) &&
    emailLinkParams?.action !== "feedback" &&
    !isReviewDeepLink(emailLinkParams);

  useIntroductionDeepLink({
    emailLinkParams,
    isLoading,
    action: "review",
    enabled: emailLinkParams?.action !== "feedback",
    items: realRequests,
    findItem: (id) => realRequests.find((r) => r.id === id),
    canOpen: canOpenReviewDialog,
    onReady: (request) => {
      setSelectedRequest(request);
      setIsMakeIntroDialogOpen(true);
    },
    onHandled: onEmailLinkHandled,
    notFoundContext: "inbox",
    refetch: fetchRequests,
  });

  useIntroductionDeepLinkLocal({
    emailLinkParams,
    isLoading,
    enabled: isNonReviewInboxLink,
    items: realRequests,
    findItem: (id) => realRequests.find((r) => r.id === id),
    onReady: () => {},
    onHandled: onEmailLinkHandled,
    notFoundContext: "inbox",
    openOnFound: false,
  });

  useEffect(() => {
    if (!currentUser) return;

    const userId = String(currentUser.id || currentUser.email);
    if (previousUserIdRef.current !== userId) {
      previousUserIdRef.current = userId;
    }

    fetchRequests();
  }, [currentUser, search, fetchRequests]);

  // Handle manual refresh trigger from parent
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0 && currentUser) {
      fetchRequests();
    }
  }, [refreshTrigger, currentUser, fetchRequests]);

  const handleAiAssist = async (action: string) => {
    if (!selectedRequest) return;

    setIsAiAssisting(true);

    try {
      // TODO: Replace with Express OpenAI endpoint when OpenAI integration is set up
      toast({
        title: "AI Assist Coming Soon",
        description:
          "AI email assistance will be available after OpenAI integration is configured.",
        variant: "default",
      });
    } catch {
      toast({
        title: "AI Assist Failed",
        description: "Unable to get AI assistance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAiAssisting(false);
    }
  };

  const handleViewReviews = (requester: {
    trustScore?: number;
    current_trust_score?: number;
    name?: string;
    id?: string;
  }) => {
    setSelectedRequesterForReview(requester);
    setReviewsDialogOpen(true);
  };

  const handleSendIntroduction = async () => {
    if (!selectedRequest) return;

    toast({
      title: "Introduction Sent!",
      description: `Introduction email sent to ${selectedRequest?.targetName}`,
    });

    setIsIntroDialogOpen(false);
    setSelectedRequest(null);
    setRecommendedTemplate(null);
  };

  const handleDecline = async (reason: string, message?: string) => {
    if (!requestToDecline) return;

    setIsDeclining(true);
    try {
      await api.introductions.decline(requestToDecline.id, reason, message);

      toast({
        title: "Request Declined",
        description: "The introduction request has been declined.",
      });

      setIsDeclineDialogOpen(false);
      setRequestToDecline(null);

      // Refresh the requests list using Express API
      await fetchRequests();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to decline request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeclining(false);
    }
  };

  const handleOpenBountyRevision = (request: InboxRequest) => {
    setSelectedRequestForBountyRevision(request);
    setIsBountyRevisionOpen(true);
  };

  const handleBountyUpdateSuccess = async () => {
    await fetchRequests();
  };

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              className="h-[260px] w-full rounded-2xl bg-muted/60"
            />
          ))}
        </div>
      ) : hasError ? (
        <Card className="rounded-2xl border border-border bg-card shadow-brand-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-brand-destructive/10 text-brand-destructive">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-base font-extrabold tracking-tight text-foreground">
              Couldn't load your requests
            </h3>
            <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-muted-foreground">
              Something went wrong while loading your incoming introduction
              requests. Please try again.
            </p>
            <Button
              variant="outline"
              onClick={() => fetchRequests()}
              className="rounded-xl border-border bg-card hover:bg-brand-amethyst/10 hover:text-brand-amethyst hover:border-brand-amethyst/20"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {realRequests.length === 0 ? (
            <Card className="rounded-2xl border border-border bg-card shadow-brand-card">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
                  <Inbox className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-base font-extrabold tracking-tight text-foreground">
                  No requests yet
                </h3>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                  You don't have any pending introduction requests right now.
                  Browse the marketplace to grow your network and start earning
                  referral payouts.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:items-start">
              {/* <InboxFilters className="hidden lg:block" /> */}
              <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2 items-stretch">
                {realRequests.map((request) => (
                  <InboxCard
                    key={request.id}
                    request={request}
                    setSelectedRequesterDetails={setSelectedRequesterDetails}
                    setIsRequesterPopupOpen={setIsRequesterPopupOpen}
                    handleViewReviews={handleViewReviews}
                    setSelectedRequest={setSelectedRequest}
                    setIsMakeIntroDialogOpen={setIsMakeIntroDialogOpen}
                    handleOpenBountyRevision={handleOpenBountyRevision}
                    setRequestToDecline={setRequestToDecline}
                    setIsDeclineDialogOpen={setIsDeclineDialogOpen}
                    isDeclineDialogOpen={isDeclineDialogOpen}
                    isDeclining={isDeclining}
                    requestToDecline={requestToDecline}
                    setSelectedRequestForEmail={setSelectedRequestForEmail}
                    setEmailTrackingModalOpen={setEmailTrackingModalOpen}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <InboxDialogs
        isIntroDialogOpen={isIntroDialogOpen}
        setIsIntroDialogOpen={setIsIntroDialogOpen}
        selectedRequest={selectedRequest}
        introSubject={introSubject}
        setIntroSubject={setIntroSubject}
        introMessage={introMessage}
        setIntroMessage={setIntroMessage}
        recommendedTemplate={recommendedTemplate}
        isLoadingRecommendation={isLoadingRecommendation}
        isAiAssisting={isAiAssisting}
        handleAiAssist={handleAiAssist}
        handleSendIntroduction={handleSendIntroduction}
        prospectlyFooter={prospectlyFooter}
        selectedRequesterForReview={selectedRequesterForReview}
        reviewsDialogOpen={reviewsDialogOpen}
        setReviewsDialogOpen={setReviewsDialogOpen}
        isRequesterPopupOpen={isRequesterPopupOpen}
        setIsRequesterPopupOpen={setIsRequesterPopupOpen}
        selectedRequesterDetails={selectedRequesterDetails}
        isBountyRevisionOpen={isBountyRevisionOpen}
        setIsBountyRevisionOpen={setIsBountyRevisionOpen}
        selectedRequestForBountyRevision={selectedRequestForBountyRevision}
        setSelectedRequestForBountyRevision={
          setSelectedRequestForBountyRevision
        }
        handleBountyUpdateSuccess={handleBountyUpdateSuccess}
        feedbackModalOpen={feedbackModalOpen}
        setFeedbackModalOpen={setFeedbackModalOpen}
        selectedFeedback={selectedFeedback}
        isMakeIntroDialogOpen={isMakeIntroDialogOpen}
        setIsMakeIntroDialogOpen={setIsMakeIntroDialogOpen}
        setSelectedRequest={setSelectedRequest}
        fetchRequests={fetchRequests}
        setRealRequests={setRealRequests}
        queryClient={queryClient}
        isDeclineDialogOpen={isDeclineDialogOpen}
        setIsDeclineDialogOpen={setIsDeclineDialogOpen}
        handleDecline={handleDecline}
        requestToDecline={requestToDecline}
        emailTrackingModalOpen={emailTrackingModalOpen}
        setEmailTrackingModalOpen={setEmailTrackingModalOpen}
        selectedRequestForEmail={selectedRequestForEmail}
        setSelectedRequestForEmail={setSelectedRequestForEmail}
      />
    </div>
  );
}
