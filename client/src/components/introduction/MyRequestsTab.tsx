import { useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Users,
  Target,
  Shield,
  Linkedin,
  User,
  MessageSquare,
  XCircle,
  Calendar,
  DollarSign,
  Building2,
  Info,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  Send,
  Globe,
  Mail,
  MapPin, // Added MapPin
  RefreshCcw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ReviewsDialog } from "./ReviewsDialog";
import { MoveToMarketplaceDialog } from "./MoveToMarketplaceDialog";
import { RequesterDetailsPopup } from "./RequesterDetailsPopup";
import {
  formatLocalizedShortDate,
  formatDateTime,
} from "@/utils/dateFormatter";
import { toUTC, utcDayjs } from "@/lib/dayjs";
import { AnyType } from "@/types/common";
import { PremiumAvatar } from "../shared/PremiumAvatar";
import { AccountDeletedInfo } from "./AccountDeletedInfo";
import { ConnectorPoolCard } from "./ConnectorPoolCard";

interface MyRequest {
  id: string;
  prospect: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    company: string;
    title: string;
    linkedIn: string;
    location: string;
    industry: string;
    employees?: string;
    linkedinConnections?: string;
    websiteUrl?: string | null;
    email?: string | null;
    profilePhotoUrl?: string | null;
    companyLinkedinUrl?: string | null;
  };
  prospectPhotoUrl?: string | null;
  requestedFromPhotoUrl?: string | null;
  requestedFrom: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    company: string;
    title: string;
    linkedIn: string;
    trustScore: number;
    introductionScore: number;
    feedbackScore: number;
    badgeBonusScore: number;
    location: string;
    profilePhotoUrl?: string | null;
    email?: string;
    websiteUrl?: string;
    industry?: string;
    bio?: string;
    jobTitle?: string;
    linkedinUrl?: string;
    isDeleted?: boolean;
  } | null;
  potentialConnectors?: {
    totalCount: number;
    pendingCount: number;
    declinedCount: number;
    hasAccepted: boolean;
  };
  bountyAmount: number;
  totalAmount?: number;
  meetingTitle?: string | null;
  purpose: string;
  urgency: "urgent" | "high" | "medium" | "low";
  status: "pending" | "accepted" | "declined" | "in-progress" | "completed";
  stage?: string; // e.g., 'request_accepted', 'intro_sent', 'meeting_booked', 'meeting_completed', 'peer_feedback'
  stageTitle?: string;
  requesterFeedbackCompleted?: boolean;
  requesterArchived?: boolean;
  daysRemaining: number;
  submittedDate: string;
  meetingType: "virtual" | "in-person" | "flexible";
  additionalContext?: string | null;
  createdAt?: Date; // Store for date formatting
  // Marketplace fields
  isMarketplaceVisible?: boolean;
  canMoveToMarketplace?: boolean;
  // Meeting date information
  meetingDate?: string | null;
  meetingStartTime?: string | null;
}

const normalizeExternalUrl = (url: string) =>
  url.startsWith("http") ? url : `https://${url}`;

const normalizeLinkedInUrl = (linkedIn: string) =>
  linkedIn.startsWith("http")
    ? linkedIn
    : `https://linkedin.com/in/${linkedIn}`;

function isMeetingNoShow(request: MyRequest): boolean {
  const meetingDate = request.meetingStartTime || request.meetingDate;
  return (
    request.stage === "meeting_booked" &&
    !!meetingDate &&
    utcDayjs(meetingDate).isBefore(utcDayjs())
  );
}

function getRequestFooterTitle(request: MyRequest): string {
  if (request.requesterArchived) return "Archived";
  if (request.stage === "peer_feedback") return "Peer Feedback";
  if (request.stage === "meeting_completed") return "Meeting Completed";
  if (request.stage === "meeting_booked" && !isMeetingNoShow(request)) {
    return "Meeting Booked";
  }
  if (request.stage === "intro_sent") return "Introduction Sent";
  if (request.stage === "request_accepted") return "Request Accepted";
  if (!request.stage && request.status === "pending")
    return "Awaiting Response";
  if (request.status === "declined") return "Declined";
  return "";
}

function getPendingRequestFooterSubtitle(request: MyRequest): string {
  if (request.requestedFrom) {
    return "• Waiting for connector to accept";
  }
  const pendingCount = request.potentialConnectors?.pendingCount;
  if (pendingCount) {
    const suffix = pendingCount > 1 ? "s" : "";
    return `• Waiting for ${pendingCount} connector${suffix} to respond`;
  }
  return "• Waiting for connectors to respond";
}

function getRequestFooterSubtitle(request: MyRequest): string {
  if (request.requesterArchived) return "• Introduction completed";
  if (request.stage === "peer_feedback")
    return "• Provide feedback to complete";
  if (request.stage === "meeting_completed") {
    return "• Meeting finished, awaiting feedback";
  }
  if (request.stage === "meeting_booked" && !isMeetingNoShow(request)) {
    return "• Meeting scheduled with prospect";
  }
  if (request.stage === "intro_sent")
    return "• Introduction email sent to prospect";
  if (request.stage === "request_accepted")
    return "• Connector accepted request";
  if (!request.stage && request.status === "pending") {
    return getPendingRequestFooterSubtitle(request);
  }
  if (request.status === "declined") return "• Request declined by connector";
  return "";
}

function RequestCardFooter({
  request,
  onMoveToMarketplace,
}: {
  request: MyRequest;
  onMoveToMarketplace: (requestId: string) => void;
}) {
  const showDot = !isMeetingNoShow(request);
  const footerTitle = getRequestFooterTitle(request);
  const footerSubtitle = getRequestFooterSubtitle(request);

  return (
    <div className="mt-6 pt-5 border-t border-border/50">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {showDot && (
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                (!request.stage || request.status === "pending") &&
                  "bg-yellow-500",
                request.stage === "request_accepted" && "bg-green-500",
                request.stage === "intro_sent" && "bg-blue-500",
                request.stage === "meeting_booked" && "bg-indigo-500",
                request.stage === "meeting_completed" && "bg-orange-500",
                request.stage === "peer_feedback" && "bg-emerald-500",
                request.requesterArchived && "bg-purple-500",
                request.status === "declined" && "bg-red-500"
              )}
            />
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-foreground">
              {footerTitle}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {footerSubtitle}
            </span>
          </div>
        </div>
        {request.canMoveToMarketplace && !request.isMarketplaceVisible && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onMoveToMarketplace(request.id);
            }}
            className="flex-shrink-0 gap-1.5 bg-gradient-to-r from-primary/10 to-purple-600/10 border-primary/30 hover:border-primary/50 hover:bg-gradient-to-r hover:from-primary/20 hover:to-purple-600/20 text-primary"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Move to Marketplace</span>
            <span className="sm:hidden">Marketplace</span>
          </Button>
        )}
      </div>
    </div>
  );
}

interface MyRequestCardProps {
  request: MyRequest;
  getStageBadge: (request: MyRequest) => ReactNode;
  onOpenConnectorProfile: (
    connector: NonNullable<MyRequest["requestedFrom"]>,
    photoUrl: string | null
  ) => void;
  onViewReviews: (connector: NonNullable<MyRequest["requestedFrom"]>) => void;
  onMoveToMarketplace: (requestId: string) => void;
}

function MyRequestCard({
  request,
  getStageBadge,
  onOpenConnectorProfile,
  onViewReviews,
  onMoveToMarketplace,
}: MyRequestCardProps) {
  const connector = request.requestedFrom;
  const linkedInUrl = connector?.linkedIn || connector?.linkedinUrl || "";

  return (
    <Card
      key={request.id}
      className="group flex flex-col border-2 overflow-hidden"
    >
      <CardHeader className="relative pb-4 pt-2 px-4 bg-transparent overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-purple-600/50 to-primary/50 z-10" />
        <div className="flex items-center justify-between mb-5 mt-2">
          <div className="flex items-center gap-3">
            {getStageBadge(request)}
            {request.createdAt && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Submitted {formatDateTime(request.createdAt)}</span>
              </div>
            )}
          </div>
          <div className="px-4 py-2 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-slate-900/50 dark:to-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 text-center">
              REFERRAL PAYOUT
            </div>
            <div className="flex items-center justify-center gap-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
                {Number(request.bountyAmount ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        {request.meetingTitle && (
          <div className="mb-4">
            <div
              className="text-lg font-bold text-foreground leading-tight line-clamp-2"
              title={request.meetingTitle}
            >
              {request.meetingTitle}
            </div>
          </div>
        )}
        {request.purpose && request.purpose !== "No message provided" && (
          <div className="mb-5">
            <div className="text-sm text-foreground leading-relaxed">
              {request.purpose}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-8 items-stretch mb-5">
          {connector ? (
            <div className="w-full h-full relative p-5 bg-gradient-to-br from-blue-50/60 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-950/10 border border-blue-200/50 dark:border-blue-800/40 rounded-xl shadow-sm flex flex-col justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600/70 dark:text-blue-400/70 mb-4">
                Connector
              </div>
              <div className="flex flex-col gap-4 flex-1">
                {connector.name !== "User's Account deleted" ? (
                  <>
                    <div className="flex justify-between items-start">
                      <div className="flex gap-5 min-w-0">
                        <PremiumAvatar
                          name={connector.name}
                          size="md"
                          qualityScore={connector.trustScore / 10}
                          imageUrl={connector.profilePhotoUrl}
                          className="h-12 w-12 flex-shrink-0"
                        />
                        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-bold text-foreground leading-tight break-words min-w-0">
                              {connector.name}
                            </span>
                            {connector.jobTitle && (
                              <Badge
                                variant="secondary"
                                className="px-2 py-0.5 h-auto min-h-[20px] text-[10px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-700 hover:text-blue-100 hover:bg-blue-200 border-none max-w-full break-words"
                                title={connector.jobTitle}
                              >
                                <span className="line-clamp-2">
                                  {connector.jobTitle}
                                </span>
                              </Badge>
                            )}
                            {connector.industry && (
                              <Badge
                                variant="secondary"
                                className="px-2 py-0.5 h-auto min-h-[20px] text-[10px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-700 hover:text-blue-100 hover:bg-blue-200 border-none max-w-full break-words"
                                title={connector.industry}
                              >
                                <span className="line-clamp-2">
                                  {connector.industry}
                                </span>
                              </Badge>
                            )}
                          </div>
                          {connector.company && (
                            <div className="flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-400">
                              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">
                                {connector.company}
                              </span>
                            </div>
                          )}
                          {connector.location && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                              <span className="truncate">
                                {connector.location}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-center flex-shrink-0 ml-4 gap-0.5">
                        <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-bold text-sm">
                          <Shield className="h-4 w-4" />
                          <span>{connector.trustScore}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wide">
                          Trust Score
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenConnectorProfile(
                            connector,
                            request.requestedFromPhotoUrl ?? null
                          );
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-100/50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-700 hover:bg-blue-700 hover:text-blue-100 dark:text-blue-300 dark:hover:bg-blue-300 dark:hover:text-blue-900 transition-colors text-[11px] font-medium border border-blue-200 dark:border-blue-800"
                      >
                        <User className="h-3.5 w-3.5 flex-shrink-0" />
                        Profile
                      </button>
                      {connector.email && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-100/50 text-blue-700 text-[11px] font-medium max-w-full">
                          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                          <span
                            className="truncate max-w-[170px]"
                            title={connector.email}
                          >
                            {connector.email}
                          </span>
                        </div>
                      )}
                      {linkedInUrl && (
                        <a
                          href={normalizeLinkedInUrl(linkedInUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-100/50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-700 text-[11px] font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                          LinkedIn
                        </a>
                      )}
                      {connector.websiteUrl && (
                        <a
                          href={normalizeExternalUrl(connector.websiteUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-100/50 text-blue-700 text-[11px] font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                          Company Website
                        </a>
                      )}
                      {!connector.isDeleted && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewReviews(connector);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-100/50 text-blue-700 text-[11px] font-medium ml-auto border border-blue-200 dark:border-blue-800"
                        >
                          <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                          Reviews
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center">
                    <AccountDeletedInfo variant="blue" className="w-full" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <ConnectorPoolCard
              variant="active"
              potentialConnectors={request.potentialConnectors}
            />
          )}
          <div className="w-full h-full relative p-5 bg-gradient-to-br from-purple-50/60 to-purple-50/30 dark:from-purple-950/30 dark:to-purple-950/10 border border-purple-200/50 dark:border-purple-800/40 rounded-xl shadow-sm flex flex-col justify-between">
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600/70 dark:text-purple-400/70 mb-4">
              Prospect
            </div>
            <div className="flex flex-col gap-4 flex-1">
              {request.prospect.name !== "User's Account deleted" ? (
                <>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-5 min-w-0">
                      <PremiumAvatar
                        name={request.prospect.name}
                        size="md"
                        qualityScore={8}
                        imageUrl={request.prospectPhotoUrl}
                        className="h-12 w-12 flex-shrink-0"
                      />
                      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-bold text-foreground leading-tight break-words min-w-0">
                            {request.prospect.name}
                          </span>
                          {request.prospect.title && (
                            <Badge
                              variant="secondary"
                              className="px-2 py-0.5 h-auto min-h-[20px] text-[10px] font-medium bg-purple-100 text-purple-700 border-none max-w-full break-words"
                              title={request.prospect.title}
                            >
                              <span className="line-clamp-2">
                                {request.prospect.title}
                              </span>
                            </Badge>
                          )}
                          {request.prospect.industry && (
                            <Badge
                              variant="secondary"
                              className="px-2 py-0.5 h-auto min-h-[20px] text-[10px] font-medium bg-purple-100 text-purple-700 border-none max-w-full break-words"
                              title={request.prospect.industry}
                            >
                              <span className="line-clamp-2">
                                {request.prospect.industry}
                              </span>
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground truncate">
                          {request.prospect.company && (
                            <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 font-medium">
                              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">
                                {request.prospect.company}
                              </span>
                            </div>
                          )}
                          {request.prospect.company &&
                            request.prospect.employees && (
                              <span className="text-slate-400 dark:text-slate-600">
                                •
                              </span>
                            )}
                          {request.prospect.employees && (
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                              <span className="truncate">
                                {request.prospect.employees}
                              </span>
                            </div>
                          )}
                        </div>
                        {request.prospect.location && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-purple-500" />
                            <span className="truncate">
                              {request.prospect.location}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {request.prospect.linkedinConnections && (
                      <div className="flex flex-col items-end flex-shrink-0 ml-4">
                        <div className="flex items-center gap-1 text-purple-700 dark:text-purple-400 font-bold text-sm">
                          <Users className="h-4 w-4" />
                          {request.prospect.linkedinConnections}+
                        </div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wide">
                          connections
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
                    {request.prospect.email && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-100/50 text-purple-700 text-[11px] font-medium max-w-full">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        <span
                          className="truncate max-w-[150px]"
                          title={request.prospect.email}
                        >
                          {request.prospect.email}
                        </span>
                      </div>
                    )}
                    {request.prospect.linkedIn && (
                      <a
                        href={normalizeLinkedInUrl(request.prospect.linkedIn)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-100/50 text-purple-700 text-[11px] font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                        LinkedIn
                      </a>
                    )}
                    {request.prospect.websiteUrl && (
                      <a
                        href={normalizeExternalUrl(request.prospect.websiteUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-100/50 text-purple-700 text-[11px] font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                        Company Website
                      </a>
                    )}
                    {request.prospect.companyLinkedinUrl && (
                      <a
                        href={normalizeExternalUrl(
                          request.prospect.companyLinkedinUrl
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-100/50 text-purple-700 text-[11px] font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                        Company LinkedIn
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center">
                  <AccountDeletedInfo variant="purple" className="w-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 flex-1 flex flex-col justify-between px-4">
        <div className="space-y-5 w-full">
          {request.additionalContext && (
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50/80 to-blue-50/40 dark:from-blue-950/50 dark:to-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold mb-1 text-blue-700 dark:text-blue-300">
                    Additional Context
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {request.additionalContext}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <RequestCardFooter
          request={request}
          onMoveToMarketplace={onMoveToMarketplace}
        />
      </CardContent>
    </Card>
  );
}

export function MyRequestsTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewsDialogOpen, setReviewsDialogOpen] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<
    MyRequest["requestedFrom"] | null
  >(null);
  const [expandedConnectors, setExpandedConnectors] = useState<Set<string>>(
    new Set()
  );
  // Marketplace dialog state
  const [marketplaceDialogOpen, setMarketplaceDialogOpen] = useState(false);
  const [selectedRequestForMarketplace, setSelectedRequestForMarketplace] =
    useState<string | null>(null);

  // Requester details popup state - reusing for Connector
  const [isConnectorPopupOpen, setIsConnectorPopupOpen] = useState(false);
  const [selectedConnectorDetails, setSelectedConnectorDetails] = useState<{
    requester: AnyType | null;
    photoUrl: string | null;
  }>({ requester: null, photoUrl: null });

  // Fetch introduction requests using React Query
  const { data: apiData, isLoading } = useQuery<AnyType[]>({
    queryKey: ["/api/introduction-requests/my-requests"],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Transform API data to match frontend interface
  const requests: MyRequest[] = (apiData || []).map((req: AnyType) => {
    const createdDate = toUTC(req.createdAt);
    const daysElapsed = Math.floor(
      (toUTC().valueOf() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const prospectFirstName = req.prospect?.firstName || "";
    const prospectLastName = req.prospect?.lastName || "";
    const prospectName =
      `${prospectFirstName} ${prospectLastName}`.trim() ||
      req.contactName ||
      "User's Account deleted";

    // Determine if we have an accepted connector or multiple pending connectors
    const hasAcceptedConnector = req.potentialConnectors?.hasAccepted || false;
    const pendingConnectorCount = req.potentialConnectors?.pendingCount || 0;

    // Show connector details if:
    // 1. A connector has accepted (multi-connector flow), OR
    // 2. There's a connector from legacy flow (contactOwner)
    // Otherwise, show pending status for multiple connectors
    let requestedFrom = null;
    if (req.connector) {
      const connectorFirstName = req.connector?.firstName || "";
      const connectorLastName = req.connector?.lastName || "";
      const connectorName =
        `${connectorFirstName} ${connectorLastName}`.trim() ||
        "User's Account deleted";

      requestedFrom = {
        id: req.connector.id || req.contactOwnerId || "",
        name: connectorName,
        firstName: connectorFirstName,
        lastName: connectorLastName,
        company: req.connector.company || "",
        title: "Connector",
        jobTitle: req.connector.jobTitle || req.connector.title,
        linkedIn: req.connector.linkedinUrl || "",
        linkedinUrl: req.connector.linkedinUrl,
        trustScore: req.connector.trustScore || 0,
        introductionScore: req.connector.introductionScore || 0,
        feedbackScore: req.connector.feedbackScore || 0,
        badgeBonusScore: req.connector.badgeBonusScore || 0,
        location: req.connector.location || "Unknown",
        profilePhotoUrl: req.connector?.profilePhotoUrl || null,
        email: req.connector.email,
        websiteUrl: req.connector.websiteUrl,
        industry: req.connector.industry,
        bio: req.connector.bio,
      };
    } else if (
      req.connector === null &&
      req.status !== "pending" &&
      req.status !== "declined"
    ) {
      requestedFrom = {
        id: "",
        name: "User's Account deleted",
        firstName: "",
        lastName: "",
        company: "",
        title: "Connector",
        jobTitle: "",
        linkedIn: "",
        linkedinUrl: "",
        isDeleted: true,
        trustScore: 0,
        introductionScore: 0,
        feedbackScore: 0,
        badgeBonusScore: 0,
        location: "",
        profilePhotoUrl: null,
        email: "",
        websiteUrl: "",
        industry: "",
        bio: "",
      };
    }

    return {
      id: req.id,
      prospect: {
        id: req.prospect?.id || req.contactId || "",
        name: prospectName,
        firstName: prospectFirstName,
        lastName: prospectLastName,
        company: req.prospect?.company || "",
        title: req.prospect?.jobTitle || "",
        linkedIn: req.prospect?.linkedinUrl || "",
        websiteUrl: req.prospect?.websiteUrl || "",
        email: req.prospect?.email || "",
        location: req.prospect?.location || "",
        industry: req.prospect?.industry || "",
        employees: req.prospect?.employees,
        linkedinConnections: req.prospect?.linkedinConnections,
        companyLinkedinUrl: req.prospect?.companyLinkedinUrl,
      },
      prospectPhotoUrl: req.prospect?.profilePhotoUrl || null,
      requestedFromPhotoUrl: requestedFrom?.profilePhotoUrl || null,
      requestedFrom: requestedFrom,
      potentialConnectors: req.potentialConnectors,
      bountyAmount: Number(req.adjustedBountyAmount ?? req.bountyAmount ?? 0),
      totalAmount: Number(req.totalAmount ?? 0),
      meetingTitle: req.meetingTitle || null,
      purpose: req.meetingDescription || "No message provided",
      additionalContext: req.additionalContext || null,
      urgency: "medium",
      status: req.status || "pending",
      stage: req.stage, // e.g., 'request_accepted', 'intro_sent', 'meeting_booked', 'meeting_completed', 'peer_feedback'
      stageTitle: req.stageTitle,
      requesterFeedbackCompleted: req.requesterFeedbackCompleted,
      requesterArchived: req.requesterArchived,
      daysRemaining: Math.max(0, 14 - daysElapsed),
      submittedDate: formatLocalizedShortDate(createdDate),
      createdAt: createdDate, // Store for date formatting
      meetingType:
        req.meetingPlatform === "virtual"
          ? "virtual"
          : req.meetingPlatform === "in-person"
            ? "in-person"
            : "flexible",
      // Marketplace fields
      isMarketplaceVisible: req.isMarketplaceVisible || false,
      canMoveToMarketplace: req.canMoveToMarketplace || false,
      // Meeting date information
      meetingDate: req.meetingDate || null,
      meetingStartTime: req.meetingStartTime || null,
    };
  });

  const filteredRequests = requests.filter((request) => {
    // Exclude archived requests from "My Requests" tab
    if (request.requesterArchived) {
      return false;
    }
    const matchesStatus =
      statusFilter === "all" || request.status === statusFilter;
    return matchesStatus;
  });

  const formatStatus = (status: string) => {
    // Format status for display
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatStage = (request: MyRequest) => {
    // Prioritize stage over status for display
    if (request.requesterArchived) {
      return "Archived";
    }
    if (request.stage === "peer_feedback") {
      return "Peer Feedback";
    }
    if (request.stage === "meeting_completed") {
      return "Meeting Completed";
    }
    if (request.stage === "meeting_rescheduled") {
      return "Rescheduled";
    }
    if (request.stage === "meeting_booked") {
      return "Meeting Booked";
    }
    if (request.stage === "intro_sent") {
      return "Introduction Sent";
    }
    if (request.stage === "request_accepted") {
      return "Request Accepted";
    }
    if (request.status === "declined") {
      return "Declined";
    }
    if (request.status === "pending") {
      return "Pending";
    }
    return formatStatus(request.status);
  };

  const getStageBadge = (request: MyRequest) => {
    // Determine the status/stage to use (prioritize stage, then status)
    let statusKey: string = "";

    if (request.requesterArchived) {
      statusKey = "archived";
    } else if (request.stage) {
      statusKey = request.stage;
    } else if (request.status === "in-progress") {
      // Map in-progress to a default stage
      statusKey = "pending";
    } else {
      statusKey = request.status || "pending";
    }

    // Map request_accepted to accepted for consistency
    if (statusKey === "request_accepted") {
      statusKey = "accepted";
    }

    // Check if meeting date has passed for meeting_booked status
    if (statusKey === "meeting_booked") {
      const meetingDate = request.meetingStartTime || request.meetingDate;
      if (meetingDate && utcDayjs(meetingDate).isBefore(utcDayjs())) {
        statusKey = "no_show";
      }
    }

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
        label: "Booked",
        icon: CalendarCheck,
        className:
          "bg-purple-500/15 text-purple-700 hover:bg-purple-700 hover:text-purple-50 dark:text-purple-400 border-purple-500/30",
      },
      no_show: {
        label: "No Show",
        icon: XCircle,
        className:
          "bg-red-500/15 text-red-700 hover:bg-red-700 hover:text-red-50 dark:text-red-400 border-red-500/30",
      },
      meeting_rescheduled: {
        label: "Rescheduled",
        icon: RefreshCcw,
        className:
          "bg-amber-500/15 text-amber-700 hover:bg-amber-700 hover:text-amber-50 dark:text-amber-400 border-amber-500/30",
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
      archived: {
        label: "Archived",
        icon: Clock,
        className:
          "bg-purple-500/15 text-purple-700 hover:bg-purple-700 hover:text-purple-50 dark:text-purple-400 border-purple-500/30",
      },
    };

    const config = stageConfig[statusKey] || {
      label: formatStage(request),
      icon: Clock,
      className:
        "bg-slate-500/15 text-slate-700 hover:bg-slate-700 hover:text-slate-50 dark:text-slate-400 border-slate-500/30",
    };

    const Icon = config.icon;

    return (
      <Badge
        variant="outline"
        className={`gap-1 font-medium text-xs ${config.className}`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return "text-red-600 hover:bg-red-600 hover:text-red-50 bg-red-50 border-red-200";
      case "high":
        return "text-orange-600 hover:bg-orange-600 hover:text-orange-50 bg-orange-50 border-orange-200";
      case "medium":
        return "text-blue-600 hover:bg-blue-600 hover:text-blue-50 bg-blue-50 border-blue-200";
      case "low":
        return "text-green-600 hover:bg-green-600 hover:text-green-50 bg-green-50 border-green-200";
      default:
        return "text-gray-600 hover:bg-gray-600 hover:text-gray-50 bg-gray-50 border-gray-200";
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getTrustScoreBg = (score: number) => {
    if (score >= 80)
      return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800";
    if (score >= 60)
      return "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800";
    if (score >= 40)
      return "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800";
    return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800";
  };

  const getTrustStatus = (
    score: number
  ): "premium" | "standard" | "warning" | "onboarding" => {
    if (score >= 80) return "premium";
    if (score >= 60) return "standard";
    if (score >= 40) return "warning";
    return "onboarding";
  };

  const handleViewReviews = (connector: MyRequest["requestedFrom"]) => {
    setSelectedConnector(connector);
    setReviewsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reviews Dialog */}
      {selectedConnector && (
        <ReviewsDialog
          open={reviewsDialogOpen}
          onOpenChange={setReviewsDialogOpen}
          connectorName={selectedConnector.name}
          trustScore={selectedConnector.trustScore}
          userId={selectedConnector.id}
        />
      )}

      {/* Connector Details Popup */}
      <RequesterDetailsPopup
        isOpen={isConnectorPopupOpen}
        onClose={() => setIsConnectorPopupOpen(false)}
        requester={selectedConnectorDetails.requester}
        photoUrl={selectedConnectorDetails.photoUrl}
      />

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
              queryKey: ["/api/introduction-requests/my-requests"],
            });
          }}
        />
      )}

      {/* Requests List */}
      <div className="space-y-6">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                No introduction requests yet
              </h3>
              <p className="text-muted-foreground mb-4">
                {requests.length === 0
                  ? "You haven't submitted AnyType introduction requests yet. Start by browsing the marketplace or requesting introductions from your network."
                  : "No requests match your current filter. Try selecting a different status filter."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <MyRequestCard
              key={request.id}
              request={request}
              getStageBadge={getStageBadge}
              onOpenConnectorProfile={(connector, photoUrl) => {
                setSelectedConnectorDetails({
                  requester: {
                    id: connector.id,
                    full_name: connector.name,
                    first_name: connector.firstName,
                    last_name: connector.lastName,
                    company: connector.company,
                    jobTitle: connector.jobTitle,
                    industry: connector.industry,
                    bio: connector.bio,
                    websiteUrl: connector.websiteUrl,
                    linkedinUrl: connector.linkedinUrl,
                    current_trust_score: connector.trustScore,
                    profilePhotoUrl: connector.profilePhotoUrl,
                    location: connector.location,
                    email: connector.email,
                  },
                  photoUrl,
                });
                setIsConnectorPopupOpen(true);
              }}
              onViewReviews={handleViewReviews}
              onMoveToMarketplace={(requestId) => {
                setSelectedRequestForMarketplace(requestId);
                setMarketplaceDialogOpen(true);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
