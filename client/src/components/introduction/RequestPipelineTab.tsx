import React, {
  useState,
  useMemo,
  useCallback,
  useLayoutEffect,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Inbox, Filter } from "lucide-react";
import { RequestDetailsModal } from "./RequestDetailsModal";
import { BountyTransactionModal } from "./BountyTransactionModal";
import { LeaveFeedbackModal } from "./LeaveFeedbackModal";
import { ReviewsDialog } from "./ReviewsDialog";
import { MoveToMarketplaceDialog } from "./MoveToMarketplaceDialog";
import { RepublishRequestDialog } from "./RepublishRequestDialog";
import { useBountyStages } from "@/hooks/useBountyStages";
import { usePipelineFilterConfig } from "@/hooks/usePipelineFilterConfig";
import { IntroductionRequestCard } from "./IntroductionRequestCard";
import { KanbanBoard, KanbanColumn } from "./KanbanLayout";
import { Loader } from "@/components/ui/loader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { IntroductionEmailLinkParams } from "@/types/introduction-deep-link";
import { formatDistanceToNow } from "date-fns";

import { toUTC } from "@/lib/dayjs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  useIntroductionDeepLink,
  useIntroductionDeepLinkLocal,
} from "@/hooks/introduction/use-introduction-deep-link";
import { cn } from "@/lib/utils";
import { INTRODUCTION_MESSAGES } from "@/constants/introduction-messages";

import { AnyType } from "@/types/common";

interface RequestedIntroduction {
  id: string;
  prospectName: string;
  prospectCompany: string;
  prospectPhotoUrl?: string | null;
  connectorName: string | null;
  connectorCompany: string;
  connectorPhotoUrl?: string | null;
  connectorId?: string;
  requesterPhotoUrl?: string | null;
  prospectTitle?: string | null;
  prospectIndustry?: string | null;
  prospectLinkedinUrl?: string | null;
  prospectLocation?: string | null;
  prospectEmployees?: string | null;
  prospectCompanyIndustry?: string | null;
  prospectCompanyDescription?: string | null;
  prospectLinkedinConnections?: string | null;
  connectorTitle?: string | null;
  connectorIndustry?: string | null;
  connectorLinkedinUrl?: string | null;
  connectorLocation?: string | null;
  connectorTrustScore?: number;
  connectorEmail?: string | null;
  connectorWebsiteUrl?: string | null;
  connectorPhone?: string | null;
  connectorBio?: string | null;
  prospectEmail?: string | null;
  prospectWebsiteUrl?: string | null;
  prospectCompanyLinkedinUrl?: string | null;
  prospectPhone?: string | null;
  prospectBio?: string | null;
  bountyAmount: number;
  providerFee?: number;
  processingFee?: number;
  totalAmount?: number;
  stage:
    | "awaiting_connector"
    | "awaiting_intro"
    | "request_accepted"
    | "intro_sent"
    | "response_received"
    | "meeting_booked"
    | "meeting_rescheduled"
    | "meeting_completed"
    | "peer_feedback";
  originalStatus?: string;
  lastActivity: string;
  lastActivityTimestamp?: string;
  nextAction: string;
  progress: number;
  meetingDate?: string;
  meetingStartTime?: string;
  meetingTimezone?: string;
  meetingLink?: string | null;
  rating?: number;
  feedbackComments?: string;
  purpose: string;
  meetingTitle?: string | null;
  meetingDescription?: string | null;
  additionalContext?: string | null;
  initialChargeAmount?: number | null;
  initialChargeCaptured?: boolean;
  initialChargeCapturedAt?: string | null;
  remainingChargeAmount?: number | null;
  remainingChargeCaptured?: boolean;
  remainingChargeCapturedAt?: string | null;
  platformCommissionAmount?: number | null;
  initialPaymentStatus?: string | null;
  remainingPaymentStatus?: string | null;
  potentialConnectors?: {
    totalCount: number;
    pendingCount: number;
    declinedCount: number;
    hasAccepted: boolean;
  } | null;
  canMoveToMarketplace?: boolean;
  isMarketplaceVisible?: boolean;
  needsRepublish?: boolean;
  canRequesterArchive?: boolean;
  requesterArchiveBlockedByClaim?: boolean;
}

const PIPELINE_STAGE_COLORS: Record<
  string,
  {
    dotColor: string;
    bgColor: string;
    textColor: string;
    headBorder: string;
    dotRing: string;
    countBg: string;
    countText: string;
  }
> = {
  awaiting_connector: {
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    headBorder: "border-amber-500",
    dotRing: "ring-amber-500/15",
    countBg: "bg-amber-100",
    countText: "text-amber-700",
  },
  awaiting_intro: {
    dotColor: "bg-cyan-500",
    bgColor: "bg-cyan-50",
    textColor: "text-cyan-700",
    headBorder: "border-cyan-500",
    dotRing: "ring-cyan-500/15",
    countBg: "bg-cyan-100",
    countText: "text-cyan-700",
  },
  request_accepted: {
    dotColor: "bg-sky-500",
    bgColor: "bg-sky-50",
    textColor: "text-sky-700",
    headBorder: "border-sky-500",
    dotRing: "ring-sky-500/15",
    countBg: "bg-sky-100",
    countText: "text-sky-700",
  },
  intro_sent: {
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    headBorder: "border-blue-500",
    dotRing: "ring-blue-500/15",
    countBg: "bg-blue-100",
    countText: "text-blue-700",
  },
  response_received: {
    dotColor: "bg-purple-500",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
    headBorder: "border-purple-500",
    dotRing: "ring-purple-500/15",
    countBg: "bg-purple-100",
    countText: "text-purple-700",
  },
  meeting_booked: {
    dotColor: "bg-green-500",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    headBorder: "border-green-500",
    dotRing: "ring-green-500/15",
    countBg: "bg-green-100",
    countText: "text-green-700",
  },
  meeting_rescheduled: {
    dotColor: "bg-orange-500",
    bgColor: "bg-orange-50",
    textColor: "text-orange-700",
    headBorder: "border-orange-500",
    dotRing: "ring-orange-500/15",
    countBg: "bg-orange-100",
    countText: "text-orange-700",
  },
  meeting_completed: {
    dotColor: "bg-violet-500",
    bgColor: "bg-violet-50",
    textColor: "text-violet-700",
    headBorder: "border-violet-500",
    dotRing: "ring-violet-500/15",
    countBg: "bg-violet-100",
    countText: "text-violet-700",
  },
  peer_feedback: {
    dotColor: "bg-teal-500",
    bgColor: "bg-teal-50",
    textColor: "text-teal-700",
    headBorder: "border-teal-500",
    dotRing: "ring-teal-500/15",
    countBg: "bg-teal-100",
    countText: "text-teal-700",
  },
};

interface RequestPipelineTabProps {
  viewMode?: "columns" | "rows";
  onSwitchToArchive?: () => void;
  /** Debounced backend search */
  search?: string;
  emailLinkParams?: IntroductionEmailLinkParams | null;
  onEmailLinkHandled?: () => void;
}

interface PipelineDataItem {
  id: string;
  prospectName?: string;
  prospectCompany?: string;
  prospectPhotoUrl?: string | null;
  connectorName?: string | null;
  connectorCompany?: string;
  connectorPhotoUrl?: string | null;
  connectorId?: string;
  acceptedBy?: string;
  bountyAmount?: string | number;
  providerFee?: string | number;
  processingFee?: string | number;
  totalAmount?: string | number;
  stage: string;
  originalStatus?: string;
  lastActivity?: string;
  updatedAt?: string;
  createdAt?: string;
  meetingDate?: string | null;
  meetingStartTime?: string | null;
  meetingTimezone?: string | null;
  meetingLink?: string | null;
  purpose?: string;
  meetingTitle?: string | null;
  meetingDescription?: string | null;
  additionalContext?: string | null;
  rating?: number;
  feedbackComments?: string;
  prospectTitle?: string | null;
  prospectIndustry?: string | null;
  prospectLinkedinUrl?: string | null;
  prospectLocation?: string | null;
  prospectEmployees?: string | null;
  prospectCompanyIndustry?: string | null;
  prospectCompanyDescription?: string | null;
  prospectLinkedinConnections?: string | null;
  connectorTitle?: string | null;
  connectorIndustry?: string | null;
  connectorLinkedinUrl?: string | null;
  connectorLocation?: string | null;
  connectorTrustScore?: number;
  connectorEmail?: string | null;
  connectorWebsiteUrl?: string | null;
  connectorPhone?: string | null;
  connectorBio?: string | null;
  prospectEmail?: string | null;
  prospectWebsiteUrl?: string | null;
  prospectCompanyLinkedinUrl?: string | null;
  prospectPhone?: string | null;
  prospectBio?: string | null;
  initialChargeAmount?: number | null;
  initialChargeCaptured?: boolean;
  initialChargeCapturedAt?: string | null;
  remainingChargeAmount?: number | null;
  remainingChargeCaptured?: boolean;
  remainingChargeCapturedAt?: string | null;
  platformCommissionAmount?: number | null;
  initialPaymentStatus?: string | null;
  remainingPaymentStatus?: string | null;
  potentialConnectors?: {
    totalCount: number;
    pendingCount: number;
    declinedCount: number;
    hasAccepted: boolean;
  } | null;
  canMoveToMarketplace?: boolean;
  isMarketplaceVisible?: boolean;
  needsRepublish?: boolean;
  canRequesterArchive?: boolean;
  requesterArchiveBlockedByClaim?: boolean;
}

type IntroRecordModalState = Record<string, boolean>;

function patchIntroRecordModal({
  prev,
  introId,
  open,
}: {
  prev: IntroRecordModalState;
  introId: string;
  open: boolean;
}): IntroRecordModalState {
  return { ...prev, [introId]: open };
}

function getPipelineFilterStageId(stage: string): string {
  if (stage === "meeting_rescheduled") return "meeting_booked";
  return stage;
}

function openIntroRecordModal({
  introId,
  setModalState,
}: {
  introId: string;
  setModalState: React.Dispatch<React.SetStateAction<IntroRecordModalState>>;
}): void {
  setModalState((prev) => patchIntroRecordModal({ prev, introId, open: true }));
}

function closeIntroRecordModal({
  introId,
  setModalState,
}: {
  introId: string;
  setModalState: React.Dispatch<React.SetStateAction<IntroRecordModalState>>;
}): void {
  setModalState((prev) =>
    patchIntroRecordModal({ prev, introId, open: false })
  );
}

function createStopPropagationHandler({
  introId,
  setModalState,
}: {
  introId: string;
  setModalState: React.Dispatch<React.SetStateAction<IntroRecordModalState>>;
}): (event: React.MouseEvent) => void {
  return (event) => {
    event.stopPropagation();
    openIntroRecordModal({ introId, setModalState });
  };
}

function createAcknowledgeDialogChangeHandler({
  introId,
  setModalState,
}: {
  introId: string;
  setModalState: React.Dispatch<React.SetStateAction<IntroRecordModalState>>;
}): (open: boolean) => void {
  return (open) => {
    setModalState((prev) => patchIntroRecordModal({ prev, introId, open }));
  };
}

export function RequestPipelineTab({
  viewMode = "columns",
  onSwitchToArchive,
  search = "",
  emailLinkParams = null,
  onEmailLinkHandled,
}: RequestPipelineTabProps) {
  // Selected intro state - currently not used but kept for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedIntro, setSelectedIntro] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedRequestForDetails, setSelectedRequestForDetails] =
    useState<RequestedIntroduction | null>(null);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [selectedRequestForTransactions, setSelectedRequestForTransactions] =
    useState<RequestedIntroduction | null>(null);
  const { stages, loading: stagesLoading } = useBountyStages();
  const {
    requesterPipelineFilterStages,
    savePipelineFilter,
    isLoading: configLoading,
  } = usePipelineFilterConfig();
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const hasInitializedFilter = useRef(false);

  useEffect(() => {
    if (!configLoading && !hasInitializedFilter.current) {
      setSelectedStages(requesterPipelineFilterStages);
      hasInitializedFilter.current = true;
    }
  }, [configLoading, requesterPipelineFilterStages]);
  const [acknowledgeDialogOpen, setAcknowledgeDialogOpen] = useState<
    Record<string, boolean>
  >({});
  const [feedbackModalOpen, setFeedbackModalOpen] = useState<
    Record<string, boolean>
  >({});
  const [reviewsDialogOpen, setReviewsDialogOpen] = useState(false);
  const [selectedConnectorForReview, setSelectedConnectorForReview] = useState<{
    id?: string;
    name?: string;
    trustScore?: number;
  } | null>(null);
  const [marketplaceDialogOpen, setMarketplaceDialogOpen] = useState(false);
  const [selectedRequestForMarketplace, setSelectedRequestForMarketplace] =
    useState<string | null>(null);
  const [republishDialogOpen, setRepublishDialogOpen] = useState(false);
  const [selectedRequestForRepublish, setSelectedRequestForRepublish] =
    useState<RequestedIntroduction | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [filterMountNode, setFilterMountNode] = useState<HTMLElement | null>(
    null
  );

  useLayoutEffect(() => {
    const el = document.getElementById("request-pipeline-filter-container");
    setFilterMountNode(el);
    return () => setFilterMountNode(null);
  }, []);

  // Fetch pipeline data from Express API
  const searchParam = search.trim() || undefined;

  const { data: pipelineData = [], isLoading: loading } = useQuery<
    PipelineDataItem[]
  >({
    queryKey: [
      "/api/requester/introduction-requests/pipeline",
      { search: searchParam },
      user?.id,
    ],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const calculateProgress = (stage: string): number => {
    const progressMap: Record<string, number> = {
      awaiting_connector: 0,
      awaiting_intro: 0,
      request_accepted: 0,
      intro_sent: 25,
      meeting_booked: 50,
      meeting_rescheduled: 50,
      meeting_completed: 75,
      peer_feedback: 100,
    };
    return progressMap[stage] || 0;
  };

  const getProgressColor = (progress: number): string => {
    if (progress === 0) return "[&>div]:bg-gray-400";
    if (progress === 25) return "[&>div]:bg-yellow-500";
    if (progress === 50) return "[&>div]:bg-blue-500";
    if (progress === 75) return "[&>div]:bg-orange-500";
    if (progress === 100) return "[&>div]:bg-green-500";
    return "[&>div]:bg-primary";
  };

  const getNextAction = (
    stage: string,
    meetingStartTime?: string | null
  ): string => {
    if (
      stage === "meeting_booked" &&
      meetingStartTime &&
      new Date(meetingStartTime).getTime() < Date.now()
    ) {
      return "Meeting time has passed. Please coordinate with the connector to reschedule.";
    }

    const actionMap: Record<string, string> = {
      awaiting_connector: "Waiting for a connector to accept your request.",
      awaiting_intro:
        "Connector accepted — waiting for them to send the introduction.",
      request_accepted: "Waiting for connector to send introduction",
      intro_sent: "Await prospect's acceptance to schedule a meeting.",
      meeting_booked: "Prepare agenda and join the scheduled meeting.",
      meeting_rescheduled: "Waiting for prospect to book a new time slot.",
      meeting_completed:
        "Confirm meeting completion acknowledge to move to peer feedback stage.",
      peer_feedback:
        "Submit feedback to earn trust score (required for new requests).",
    };
    return actionMap[stage] || "In progress";
  };

  const activeIntroductions: RequestedIntroduction[] = useMemo(() => {
    return pipelineData.map((req: PipelineDataItem) => ({
      id: req.id,
      prospectName: req.prospectName || "Unknown",
      prospectCompany: req.prospectCompany || "",
      prospectPhotoUrl: req.prospectPhotoUrl || null,
      connectorName: req.connectorName || null,
      connectorCompany: req.connectorCompany || "",
      connectorPhotoUrl: req.connectorPhotoUrl || null,
      connectorId: req.connectorId || req.acceptedBy || null,
      requesterPhotoUrl: req.connectorPhotoUrl || null,
      bountyAmount: Number(req.bountyAmount || 0),
      providerFee: Number(req.providerFee || 0),
      processingFee: Number(req.processingFee || 0),
      totalAmount: Number(req.totalAmount || 0),
      stage: req.stage as RequestedIntroduction["stage"],
      originalStatus: req.originalStatus,
      lastActivity: req.lastActivity
        ? formatDistanceToNow(toUTC(req.lastActivity), { addSuffix: true })
        : "N/A",
      lastActivityTimestamp:
        req.lastActivity || req.updatedAt || req.createdAt || null,
      nextAction: getNextAction(req.stage, req.meetingStartTime),
      progress: calculateProgress(req.stage),
      meetingDate: req.meetingDate || null,
      meetingStartTime: req.meetingStartTime || null,
      meetingTimezone: req.meetingTimezone || null,
      meetingLink: req.meetingLink || null,
      purpose: req.purpose || "",
      meetingTitle: req.meetingTitle || null,
      meetingDescription: req.meetingDescription || null,
      additionalContext: req.additionalContext || null,
      rating: req.rating,
      feedbackComments: req.feedbackComments,
      prospectTitle: req.prospectTitle,
      prospectIndustry: req.prospectIndustry,
      prospectLinkedinUrl: req.prospectLinkedinUrl,
      prospectLocation: req.prospectLocation,
      prospectEmployees: req.prospectEmployees,
      prospectCompanyIndustry: req.prospectCompanyIndustry,
      prospectCompanyDescription: req.prospectCompanyDescription,
      prospectLinkedinConnections: req.prospectLinkedinConnections,
      connectorTitle: req.connectorTitle,
      connectorIndustry: req.connectorIndustry,
      connectorLinkedinUrl: req.connectorLinkedinUrl,
      connectorLocation: req.connectorLocation,
      connectorTrustScore: req.connectorTrustScore || 0,
      connectorEmail: req.connectorEmail || null,
      connectorWebsiteUrl: req.connectorWebsiteUrl || null,
      connectorPhone: req.connectorPhone || null,
      connectorBio: req.connectorBio || null,
      prospectEmail: req.prospectEmail || null,
      prospectWebsiteUrl: req.prospectWebsiteUrl || null,
      prospectCompanyLinkedinUrl: req.prospectCompanyLinkedinUrl || null,
      prospectPhone: req.prospectPhone || null,
      prospectBio: req.prospectBio || null,
      initialChargeAmount: req.initialChargeAmount ?? null,
      initialChargeCaptured: req.initialChargeCaptured ?? false,
      initialChargeCapturedAt: req.initialChargeCapturedAt ?? null,
      remainingChargeAmount: req.remainingChargeAmount ?? null,
      remainingChargeCaptured: req.remainingChargeCaptured ?? false,
      remainingChargeCapturedAt: req.remainingChargeCapturedAt ?? null,
      platformCommissionAmount: req.platformCommissionAmount ?? null,
      initialPaymentStatus: req.initialPaymentStatus ?? null,
      remainingPaymentStatus: req.remainingPaymentStatus ?? null,
      potentialConnectors: req.potentialConnectors ?? null,
      canMoveToMarketplace: req.canMoveToMarketplace ?? false,
      isMarketplaceVisible: req.isMarketplaceVisible ?? false,
      needsRepublish: req.needsRepublish ?? false,
      canRequesterArchive: req.canRequesterArchive ?? false,
      requesterArchiveBlockedByClaim:
        req.requesterArchiveBlockedByClaim ?? false,
    }));
  }, [pipelineData]);

  const isLocalRequesterLink =
    Boolean(emailLinkParams) &&
    emailLinkParams?.action !== "feedback" &&
    emailLinkParams?.action !== "review" &&
    emailLinkParams?.action !== "acknowledge" &&
    emailLinkParams?.action !== "republish" &&
    emailLinkParams?.action !== "marketplace";

  const openMarketplaceFromDeepLink = useCallback(
    (requestId: string) => {
      toast(INTRODUCTION_MESSAGES.privateConnectorsExhausted);
      setSelectedRequestForMarketplace(requestId);
      setMarketplaceDialogOpen(true);
    },
    [toast]
  );

  const handleRepublishDeepLink = useCallback(
    (intro: RequestedIntroduction) => {
      if (intro.needsRepublish) {
        setSelectedRequestForRepublish(intro);
        setRepublishDialogOpen(true);
        return;
      }

      if (intro.canMoveToMarketplace && !intro.isMarketplaceVisible) {
        openMarketplaceFromDeepLink(intro.id);
        return;
      }

      toast(INTRODUCTION_MESSAGES.republishUnavailable);
    },
    [openMarketplaceFromDeepLink, toast]
  );

  const refetchRequesterPipeline = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["/api/requester/introduction-requests/pipeline"],
    });
  }, [queryClient]);

  useIntroductionDeepLink({
    emailLinkParams,
    isLoading: loading,
    action: "acknowledge",
    enabled:
      emailLinkParams?.action !== "feedback" &&
      emailLinkParams?.action !== "review",
    items: activeIntroductions,
    findItem: (id) => activeIntroductions.find((item) => item.id === id),
    isReadyForOpen: (intro) => intro.stage === "meeting_completed",
    onReady: (intro) => {
      const filterStageId = getPipelineFilterStageId(intro.stage);
      const isStageVisible =
        selectedStages.length === 0 || selectedStages.includes(filterStageId);

      if (!isStageVisible) {
        setSelectedStages((prev) => [...prev, filterStageId]);
      }

      setAcknowledgeDialogOpen((prev) => ({ ...prev, [intro.id]: true }));
    },
    onHandled: onEmailLinkHandled,
    notFoundContext: "pipeline",
    refetch: refetchRequesterPipeline,
  });

  useIntroductionDeepLinkLocal({
    emailLinkParams,
    isLoading: loading,
    enabled: isLocalRequesterLink,
    items: activeIntroductions,
    findItem: (id) => activeIntroductions.find((item) => item.id === id),
    onReady: (intro) => {
      setSelectedRequestForDetails(intro);
      setDetailsModalOpen(true);
    },
    onHandled: onEmailLinkHandled,
    notFoundContext: "pipeline",
    showNotFoundOnMiss: false,
  });

  useIntroductionDeepLinkLocal({
    emailLinkParams,
    isLoading: loading,
    enabled: emailLinkParams?.action === "republish",
    items: activeIntroductions,
    findItem: (id) => activeIntroductions.find((item) => item.id === id),
    onReady: handleRepublishDeepLink,
    onHandled: onEmailLinkHandled,
    notFoundContext: "pipeline",
    showNotFoundOnMiss: true,
  });

  useIntroductionDeepLinkLocal({
    emailLinkParams,
    isLoading: loading,
    enabled: emailLinkParams?.action === "marketplace",
    items: activeIntroductions,
    findItem: (id) => activeIntroductions.find((item) => item.id === id),
    canOpen: (intro) =>
      intro.canMoveToMarketplace && !intro.isMarketplaceVisible,
    onReady: (intro) => openMarketplaceFromDeepLink(intro.id),
    onHandled: onEmailLinkHandled,
    notFoundContext: "pipeline",
    showNotFoundOnMiss: true,
  });

  // Payment capture info for requester (when money is charged from them)
  const getPaymentCaptureInfo = (
    stageId: string
  ): { percentage: string; label: string } => {
    switch (stageId) {
      case "intro_sent":
        return { percentage: "5%", label: "Charged" };
      case "meeting_booked":
      case "meeting_rescheduled":
        return { percentage: "95%", label: "Charged" };
      case "meeting_completed":
        return { percentage: "100%", label: "" };
      case "peer_feedback":
        return { percentage: "100%", label: "" };
      default:
        return { percentage: "0%", label: "Pending" };
    }
  };

  const stageConfig = stages
    .filter(
      (stage: { stageId: string; stageOrder: number }) =>
        stage.stageId !== "platform_fee"
    )
    .sort(
      (a: { stageOrder: number }, b: { stageOrder: number }) =>
        a.stageOrder - b.stageOrder
    )
    .map(
      (stage: {
        stageId: string;
        title: string;
        description: string;
        stageOrder: number;
        color: string;
        icon: string;
      }) => {
        const paymentInfo = getPaymentCaptureInfo(stage.stageId);
        const colors = PIPELINE_STAGE_COLORS[stage.stageId] || {
          dotColor: "bg-slate-400",
          bgColor: "bg-slate-50",
          textColor: "text-slate-700",
          headBorder: "border-slate-400",
          dotRing: "ring-slate-400/15",
          countBg: "bg-slate-100",
          countText: "text-slate-600",
        };
        return {
          id: stage.stageId,
          name: stage.title,
          description: stage.description,
          paymentPercentage: paymentInfo.percentage,
          paymentLabel: paymentInfo.label,
          icon: stage.icon,
          ...colors,
        };
      }
    );

  const groupIntroductionsByStage = () => {
    return stageConfig.map((stage) => ({
      ...stage,
      introductions: activeIntroductions.filter((intro) => {
        if (stage.id === "meeting_booked") {
          return (
            intro.stage === "meeting_booked" ||
            intro.stage === "meeting_rescheduled"
          );
        }
        if (stage.id === "awaiting_connector") {
          return intro.stage === "awaiting_connector";
        }
        if (stage.id === "awaiting_intro") {
          return intro.stage === "awaiting_intro";
        }
        return intro.stage === stage.id;
      }),
    }));
  };

  // Helper function to derive existingFeedback from pipeline data
  const getExistingFeedbackFromIntro = useCallback(
    (intro: RequestedIntroduction) => {
      // If rating exists in pipeline data, we have feedback
      if (intro.rating !== undefined && intro.rating !== null) {
        return {
          id: intro.id, // Use intro ID as placeholder since we don't have feedback ID
          rating: intro.rating,
          feedback_text: intro.feedbackComments || "",
          meeting_completed: true, // Default to true for peer feedback
        };
      }
      return null;
    },
    []
  );

  if (stagesLoading || loading) {
    return <Loader message="Loading pipeline..." />;
  }

  const toggleCardExpansion = (introId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(introId)) {
        newSet.delete(introId);
      } else {
        newSet.add(introId);
      }
      return newSet;
    });
  };

  const handleCardClick = (intro: RequestedIntroduction) => {
    setSelectedRequestForDetails(intro);
    setDetailsModalOpen(true);
  };

  const handleViewTransactions = (
    intro: RequestedIntroduction,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setSelectedRequestForTransactions(intro);
    setTransactionModalOpen(true);
  };

  const handleFeedbackSubmitted = (introId: string) => {
    toast({
      title: "Feedback Submitted",
      description: "Thank you for your feedback!",
    });

    // Refresh pipeline data
    queryClient.invalidateQueries({
      queryKey: ["/api/requester/introduction-requests/pipeline"],
    });

    // Feedback data will be refreshed when pipeline data refetches

    // Close modal
    closeIntroRecordModal({
      introId,
      setModalState: setFeedbackModalOpen,
    });

    // Switch to Archive tab after successful feedback submission
    if (onSwitchToArchive) {
      onSwitchToArchive();
    }
  };

  const handleViewReviews = (intro: RequestedIntroduction) => {
    setSelectedConnectorForReview({
      id: intro.connectorId,
      name: intro.connectorName || "Connector",
      trustScore: 0,
    });
    setReviewsDialogOpen(true);
  };

  const stagesWithIntroductions = groupIntroductionsByStage();

  const filteredStagesWithIntroductions = stagesWithIntroductions.filter(
    (stage) => selectedStages.length === 0 || selectedStages.includes(stage.id)
  );

  const filterDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "flex h-9 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium shadow-sm transition-all",
            "hover:border-brand-amethyst/20 hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
          )}
        >
          <Filter className="h-4 w-4" />
          <span>Filter Stages</span>
          {selectedStages.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 px-1.5 font-normal border-0 text-[11px] h-5 min-w-5 flex items-center justify-center p-0"
            >
              {selectedStages.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]">
        <DropdownMenuCheckboxItem
          checked={selectedStages.length === 0}
          onCheckedChange={() => {
            setSelectedStages([]);
            savePipelineFilter("requester", []);
          }}
        >
          All Stages
        </DropdownMenuCheckboxItem>
        {stagesWithIntroductions.map((stage) => (
          <DropdownMenuCheckboxItem
            key={stage.id}
            checked={selectedStages.includes(stage.id)}
            onCheckedChange={(checked) => {
              const next = checked
                ? [...selectedStages, stage.id]
                : selectedStages.filter((id) => id !== stage.id);
              setSelectedStages(next);
              savePipelineFilter("requester", next);
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className={cn("h-2 w-2 rounded-full", stage.dotColor)} />
                {stage.name}
              </div>
              <span className="text-xs text-slate-400 ml-4 font-normal">
                {stage.introductions.length}
              </span>
            </div>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="overflow-hidden h-full flex flex-col">
      {filterMountNode
        ? createPortal(filterDropdown, filterMountNode)
        : filterDropdown}

      {/* Full-Width Kanban Board — single scroll container, symmetric edge padding */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
        <KanbanBoard className="h-full px-4 sm:px-6">
          {filteredStagesWithIntroductions.map((stage) => {
            const count = stage.introductions.length;

            return (
              <KanbanColumn
                key={stage.id}
                title={stage.name}
                count={count}
                description={stage.description}
                bgColor={stage.bgColor}
                textColor={stage.textColor}
                dotColor={stage.dotColor}
                headBorder={stage.headBorder}
                dotRing={stage.dotRing}
                countBg={stage.countBg}
                countText={stage.countText}
                paymentPercentage={
                  stage.paymentPercentage &&
                  stage.id !== "meeting_completed" &&
                  stage.id !== "peer_feedback"
                    ? stage.paymentPercentage
                    : undefined
                }
                paymentLabel={stage.paymentLabel}
              >
                {stage.introductions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-xl flex items-center justify-center mb-3 shadow-sm border border-slate-200/60 dark:border-slate-700">
                      <Inbox
                        className="h-6 w-6 text-slate-400 dark:text-slate-500"
                        strokeWidth={1.5}
                      />
                    </div>
                    <span className="text-muted-foreground dark:text-slate-300 text-[12px] font-semibold">
                      No requests in this stage
                    </span>
                  </div>
                )}
                {stage.introductions.map((intro) => (
                  <IntroductionRequestCard
                    key={intro.id}
                    intro={intro as AnyType}
                    isExpanded={expandedCards.has(intro.id)}
                    isSelected={selectedIntro === intro.id}
                    onToggleExpansion={(e) => toggleCardExpansion(intro.id, e)}
                    onCardClick={() => handleCardClick(intro as AnyType)}
                    onViewTransactions={(e) =>
                      handleViewTransactions(intro as AnyType, e)
                    }
                    onMoveToMarketplace={(e) => {
                      e.stopPropagation();
                      setSelectedRequestForMarketplace(intro.id);
                      setMarketplaceDialogOpen(true);
                    }}
                    onRepublish={(e) => {
                      e.stopPropagation();
                      setSelectedRequestForRepublish(intro as RequestedIntroduction);
                      setRepublishDialogOpen(true);
                    }}
                    onViewReviews={() => handleViewReviews(intro as AnyType)}
                    onLeaveFeedback={createStopPropagationHandler({
                      introId: intro.id,
                      setModalState: setFeedbackModalOpen,
                    })}
                    onAcknowledgeMeeting={createStopPropagationHandler({
                      introId: intro.id,
                      setModalState: setAcknowledgeDialogOpen,
                    })}
                    onUpdateStage={() => {
                      queryClient.invalidateQueries({
                        queryKey: [
                          "/api/requester/introduction-requests/pipeline",
                        ],
                      });
                    }}
                    acknowledgeDialogOpen={
                      acknowledgeDialogOpen[intro.id] || false
                    }
                    onAcknowledgeDialogOpenChange={createAcknowledgeDialogChangeHandler(
                      {
                        introId: intro.id,
                        setModalState: setAcknowledgeDialogOpen,
                      }
                    )}
                    getProgressColor={getProgressColor}
                  />
                ))}
              </KanbanColumn>
            );
          })}
        </KanbanBoard>
      </div>

      {/* Details Modal */}
      <RequestDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        request={selectedRequestForDetails}
      />

      {/* Bounty Transaction Modal */}
      <BountyTransactionModal
        open={transactionModalOpen}
        onOpenChange={setTransactionModalOpen}
        introductionRequestId={selectedRequestForTransactions?.id || ""}
        prospectName={selectedRequestForTransactions?.prospectName}
      />

      {/* Peer Feedback Modals */}
      {activeIntroductions
        .filter((intro) => intro.stage === "peer_feedback")
        .map((intro) => (
          <LeaveFeedbackModal
            key={intro.id}
            isOpen={feedbackModalOpen[intro.id] || false}
            onClose={() =>
              closeIntroRecordModal({
                introId: intro.id,
                setModalState: setFeedbackModalOpen,
              })
            }
            introductionRequestId={intro.id}
            feedbackToUserId=""
            feedbackToUserName={intro.connectorName || "Connector"}
            feedbackType="peer"
            existingFeedback={getExistingFeedbackFromIntro(intro)}
            onFeedbackSubmitted={() => handleFeedbackSubmitted(intro.id)}
          />
        ))}

      {/* Reviews Dialog */}
      {selectedConnectorForReview && (
        <ReviewsDialog
          open={reviewsDialogOpen}
          onOpenChange={setReviewsDialogOpen}
          connectorName={selectedConnectorForReview.name || "Connector"}
          trustScore={selectedConnectorForReview.trustScore || 0}
          userId={selectedConnectorForReview.id}
        />
      )}

      {selectedRequestForRepublish && (
        <RepublishRequestDialog
          isOpen={republishDialogOpen}
          onClose={() => {
            setRepublishDialogOpen(false);
            setSelectedRequestForRepublish(null);
          }}
          requestId={selectedRequestForRepublish.id}
          connectorName={selectedRequestForRepublish.connectorName}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["/api/requester/introduction-requests/pipeline"],
            });
          }}
        />
      )}

      {/* Move to Marketplace Dialog */}
      {selectedRequestForMarketplace && (
        <MoveToMarketplaceDialog
          isOpen={marketplaceDialogOpen}
          onClose={() => {
            setMarketplaceDialogOpen(false);
            setSelectedRequestForMarketplace(null);
          }}
          requestId={selectedRequestForMarketplace}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["/api/requester/introduction-requests/pipeline"],
            });
          }}
        />
      )}
    </div>
  );
}
