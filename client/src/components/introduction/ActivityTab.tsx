import { useState, useEffect, useRef, type JSX } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck,
  DollarSign,
  Calendar,
  MessageSquare,
  Coins,
  Building2,
  Info,
  Mail,
  Archive,
} from "lucide-react";
import { EmailTrackingModal } from "./EmailTrackingModal";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { StarRating } from "@/components/shared/StarRating";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { RequestDetailsModal } from "./RequestDetailsModal";
import { PayoutDetailsModal } from "./PayoutDetailsModal";
import { ReviewsDialog } from "./ReviewsDialog";
import { formatMeetingDate } from "@/utils/dateFormatting";
import { formatDistanceToNow } from "date-fns";
import { formatDateTime } from "@/utils/dateFormatter";
import { toUTC } from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { InboxCardRequester } from "./InboxCardRequester";
import { InboxCardProspect } from "./InboxCardProspect";
import { getStageBadge, InboxRequest } from "./inboxUtils";
import {
  isIntroductionRequesterWithdrawn,
  labelRequesterArchiveReason,
} from "./introductionHelpers";

// Import the RequestedIntroduction type from RequestDetailsModal
type RequestedIntroduction = {
  id: string;
  prospectName: string;
  prospectCompany: string;
  prospectPhotoUrl?: string | null;
  connectorName: string;
  connectorCompany: string;
  connectorId?: string;
  requesterName?: string;
  requesterCompany?: string;
  requesterPhotoUrl?: string | null;
  bountyAmount: number;
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
};

interface ActivityTabProps {
  showOnlyCompleted?: boolean;
  search?: string;
  emailLinkParams?: import("@/types/introduction-deep-link").IntroductionEmailLinkParams | null;
  onEmailLinkHandled?: () => void;
}

interface ActivityDataItem {
  id: string;
  requesterName?: string;
  requesterCompany?: string;
  requesterPhotoUrl?: string | null;
  requesterId?: string;
  requesterTitle?: string | null;
  requesterIndustry?: string | null;
  requesterLinkedinUrl?: string | null;
  requesterLocation?: string | null;
  requesterTrustScore?: number;
  targetName?: string;
  targetCompany?: string;
  targetPhotoUrl?: string | null;
  targetTitle?: string | null;
  targetIndustry?: string | null;
  targetLinkedinUrl?: string | null;
  targetLocation?: string | null;
  targetEmployees?: string | null;
  targetLinkedinConnections?: string | null;
  targetEmail?: string | null;
  targetWebsiteUrl?: string | null;
  targetCompanyLinkedinUrl?: string | null;
  targetBio?: string | null;
  targetOrganizations?: Array<{
    id: string;
    name: string;
    isVerified: boolean;
  }>;
  requesterEmail?: string | null;

  requesterBio?: string | null;
  requesterProducts?: string | null;
  requesterUniqueSellingProposition?: string | null;
  requesterTargetMarket?: string | null;
  requesterCompanySize?: string | null;
  requesterRevenueRange?: string | null;
  requesterKeyCredentials?: string | null;
  requesterWebsiteUrl?: string | null;
  requesterOrganizations?: Array<{
    id: string;
    name: string;
    isVerified: boolean;
  }>;
  targetCompanyIndustry?: string | null;
  targetCompanyDescription?: string | null;
  additionalContext?: string | null;
  requesterMeetingUrl?: string | null;
  requesterMeetingPlatform?: string | null;
  requesterDefaultDuration?: string | null;
  requesterAvailability?: string | null;
  preferredDuration?: string | null;
  preferredTimeSlots?: string[] | null;
  timeZone?: string | null;
  schedulingLink?: string | null;
  meetingType?: string | null;
  meetingPreferences?: {
    duration?: string;
    format?: string;
    timeframe?: string;
  } | null;
  bountyAmount?: string | number;
  stage?: string;
  status?: string;
  lastActivity?: string;
  updatedAt?: string;
  completedDate?: string;
  createdAt?: string;
  meetingDate?: string;
  rating?: number;
  feedbackComments?: string;
  purpose?: string;
  meetingTitle?: string | null;
  meetingDescription?: string | null;
  requesterArchiveReason?: string | null;
  requesterArchiveNotes?: string | null;
  requesterArchivedAt?: string | null;
  requesterArchived?: boolean;
}

interface HistoryItem extends ActivityDataItem {
  requester: string;
  requesterCompany: string;
  requesterId?: string;
  requesterTitle?: string | null;
  requesterIndustry?: string | null;
  requesterLinkedinUrl?: string | null;
  requesterLocation?: string | null;
  requesterTrustScore?: number;
  target: string;
  targetCompany: string;
  targetTitle?: string | null;
  targetIndustry?: string | null;
  targetLinkedinUrl?: string | null;
  targetLocation?: string | null;
  targetEmployees?: string | null;
  targetLinkedinConnections?: string | null;
  targetEmail?: string | null;
  targetWebsiteUrl?: string | null;
  targetCompanyLinkedinUrl?: string | null;
  targetBio?: string | null;
  requesterEmail?: string | null;

  requesterBio?: string | null;
  requesterProducts?: string | null;
  requesterUniqueSellingProposition?: string | null;
  requesterTargetMarket?: string | null;
  requesterCompanySize?: string | null;
  requesterRevenueRange?: string | null;
  requesterKeyCredentials?: string | null;
  bounty: string;
  type: "given" | "requested";
  sentDate?: string;
  lastActivity: string;
  lastActivityTimestamp: string | null;
  status: string;
  prospectName?: string;
  prospectCompany?: string;
  connectorName?: string;
  connectorCompany?: string;
  bountyAmount?: string | number;
  stage: string;
  nextAction: string;
  progress: number;
  rating?: number;
  feedbackComments?: string;
  purpose?: string;
  meetingTitle?: string | null;
  meetingDescription?: string | null;
}

// Adapt an archive HistoryItem into the InboxRequest shape so the redesigned
// Inbox person panels can be reused. Bio is intentionally omitted so the
// requester panel's "View Profile" action (which needs a popup the archive
// view doesn't have) is not rendered.
const toInboxRequest = (item: HistoryItem): InboxRequest => ({
  id: item.id,
  status: item.status,
  requester: {
    id: item.requesterId,
    name: item.requester,
    jobTitle: item.requesterTitle ?? undefined,
    industry: item.requesterIndustry ?? undefined,
    company: item.requesterCompany ?? undefined,
    location: item.requesterLocation ?? undefined,
    email: item.requesterEmail ?? undefined,
    linkedinUrl: item.requesterLinkedinUrl ?? undefined,
    websiteUrl: item.requesterWebsiteUrl ?? undefined,
    current_trust_score: item.requesterTrustScore,
    organizations: item.requesterOrganizations,
  },
  contact: {
    first_name: item.target,
    last_name: "",
    jobTitle: item.targetTitle ?? undefined,
    industry: item.targetIndustry ?? undefined,
    company: item.targetCompany ?? undefined,
    location: item.targetLocation ?? undefined,
    email: item.targetEmail ?? undefined,
    linkedin: item.targetLinkedinUrl ?? undefined,
    websiteUrl: item.targetWebsiteUrl ?? undefined,
    companyLinkedinUrl: item.targetCompanyLinkedinUrl ?? undefined,
    employees: item.targetEmployees ?? undefined,
    linkedinConnections: item.targetLinkedinConnections ?? undefined,
    organizations: item.targetOrganizations,
  },
  requesterPhotoUrl: item.requesterPhotoUrl,
  contactPhotoUrl: item.targetPhotoUrl,
});

interface HistoryItemArchiveContext {
  withdrawn: boolean;
  archiveEventDate: string | null;
}

interface HistoryItemDetailsParams {
  item: HistoryItem;
  withdrawn: boolean;
  archiveEventDate: string | null;
  bountyAmount: number;
}

interface StatusDisplayFns {
  getStatusIcon: (status: string) => JSX.Element;
  getStatusText: (status: string) => string;
}

interface ArchiveHistoryItemRenderParams {
  item: HistoryItem;
  handleViewReviews: (requester: {
    id?: string;
    name?: string;
    trustScore?: number;
  }) => void;
  onOpenPayout: (params: { item: HistoryItem }) => void;
  onOpenEmailInsights: (params: { introductionRequestId: string }) => void;
  onOpenDetails: (params: HistoryItemDetailsParams) => void;
}

interface StandardHistoryItemRenderParams {
  item: HistoryItem;
  showOnlyCompleted: boolean;
  onOpenPayout: (params: { item: HistoryItem }) => void;
  onOpenDetails: (params: HistoryItemDetailsParams) => void;
  statusDisplayFns: StatusDisplayFns;
}

interface HistoryItemRenderParams
  extends
    ArchiveHistoryItemRenderParams,
    Omit<
      StandardHistoryItemRenderParams,
      "item" | "onOpenPayout" | "onOpenDetails"
    > {
  item: HistoryItem;
}

const getHistoryItemBountyAmount = ({ item }: { item: HistoryItem }) =>
  typeof item.bountyAmount === "number"
    ? item.bountyAmount
    : Number(item.bountyAmount || item.bounty || 0);

const getHistoryItemArchiveContext = ({
  item,
}: {
  item: HistoryItem;
}): HistoryItemArchiveContext => {
  const withdrawn = isIntroductionRequesterWithdrawn({
    stage: item.stage,
    status: item.status,
  });

  const archiveEventDate =
    withdrawn && item.requesterArchivedAt
      ? item.requesterArchivedAt
      : item.completedDate ||
        item.lastActivityTimestamp ||
        item.sentDate ||
        null;

  return {
    withdrawn,
    archiveEventDate,
  };
};

const getHistoryItemLastActivity = ({
  archiveEventDate,
  fallbackLastActivity,
}: {
  archiveEventDate: string | null;
  fallbackLastActivity: string;
}) =>
  archiveEventDate && toUTC(archiveEventDate).toString() !== "Invalid Date"
    ? formatDistanceToNow(toUTC(archiveEventDate), {
        addSuffix: true,
      })
    : fallbackLastActivity;

const buildRequestedIntroduction = ({
  item,
  withdrawn,
  archiveEventDate,
  bountyAmount,
}: HistoryItemDetailsParams): RequestedIntroduction => ({
  id: item.id,
  prospectName: item.prospectName || item.target || "Unknown",
  prospectCompany:
    item.prospectCompany || item.targetCompany || "Unknown Company",
  prospectPhotoUrl: item.targetPhotoUrl || null,
  connectorName: item.connectorName || item.requester || "Unknown",
  connectorCompany:
    item.connectorCompany || item.requesterCompany || "Unknown Company",
  connectorId: item.requesterId,
  requesterName: item.requester,
  requesterCompany: item.requesterCompany,
  requesterPhotoUrl: item.requesterPhotoUrl || null,
  bountyAmount,
  stage: (withdrawn
    ? "archived"
    : item.stage) as RequestedIntroduction["stage"],
  lastActivity: getHistoryItemLastActivity({
    archiveEventDate,
    fallbackLastActivity: item.lastActivity,
  }),
  lastActivityTimestamp: archiveEventDate || null,
  nextAction: withdrawn ? "Archived" : item.nextAction,
  progress: withdrawn ? 0 : item.progress,
  meetingDate: item.meetingDate,
  rating: item.rating,
  feedbackComments: item.feedbackComments,
  purpose: item.purpose || "",
  meetingTitle: item.meetingTitle,
  meetingDescription: item.meetingDescription,
  requesterArchived: withdrawn,
  requesterArchiveReason: item.requesterArchiveReason ?? null,
  requesterArchiveNotes: item.requesterArchiveNotes ?? null,
  requesterArchivedAt: item.requesterArchivedAt ?? null,
});

const renderArchiveHistoryItem = ({
  item,
  handleViewReviews,
  onOpenPayout,
  onOpenEmailInsights,
  onOpenDetails,
}: ArchiveHistoryItemRenderParams) => {
  const bountyAmount = getHistoryItemBountyAmount({ item });
  const { withdrawn, archiveEventDate } = getHistoryItemArchiveContext({
    item,
  });
  const adaptedRequest = toInboxRequest(item);
  const archiveBadge = getStageBadge({
    status: withdrawn ? "archived" : "completed",
  } as InboxRequest);

  return (
    <Card
      key={item.id}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-brand-card transition-all hover:border-brand-amethyst/20 hover:shadow-lg max-sm:overflow-x-hidden"
    >
      {/* Header Section */}
      <CardHeader className="relative pb-4 pt-4 px-4 bg-transparent overflow-hidden max-lg:overflow-x-hidden">
        {/* Top Row: Status Badge + Date (left) + Bounty (right) */}
        {/* 1. Desktop layout */}
        <div className="hidden lg:flex flex-row items-center justify-between mb-4 mt-2">
          <div className="flex items-center gap-3 flex-wrap">
            {archiveBadge}
            {archiveEventDate && (
              <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {withdrawn ? "Archived" : "Completed"}{" "}
                  {formatDateTime(archiveEventDate)}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {item.rating != null && (
              <StarRating
                rating={item.rating}
                size="md"
                showValue
                colorScheme="yellow"
              />
            )}
            <div className="px-4 py-2 rounded-xl bg-brand-amethyst/10 border border-brand-amethyst/20 shadow-sm">
              <div className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1 text-center">
                REFERRAL PAYOUT
              </div>
              <div className="flex items-center justify-center gap-1">
                <DollarSign className="h-4 w-4 text-brand-amethyst" />
                <span className="text-[17px] font-extrabold tabular-nums text-brand-gradient">
                  {bountyAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Tablet + Mobile layout - 2x2 grid */}
        <div className="grid lg:hidden grid-cols-2 gap-x-4 gap-y-2 mb-4 mt-2">
          <div>{archiveBadge}</div>
          <div className="flex justify-end items-start">
            <div className="px-4 py-2 rounded-xl bg-brand-amethyst/10 border border-brand-amethyst/20 shadow-sm">
              <div className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1 text-center">
                REFERRAL PAYOUT
              </div>
              <div className="flex items-center justify-center gap-1">
                <DollarSign className="h-4 w-4 text-brand-amethyst" />
                <span className="text-[17px] font-extrabold tabular-nums text-brand-gradient">
                  {bountyAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          {archiveEventDate && (
            <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground col-span-2">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                {withdrawn ? "Archived" : "Completed"}{" "}
                {formatDateTime(archiveEventDate)}
              </span>
            </div>
          )}
          {item.rating != null && (
            <div className="col-span-2 flex">
              <StarRating
                rating={item.rating}
                size="md"
                showValue
                colorScheme="yellow"
              />
            </div>
          )}
        </div>

        {/* Meeting Title */}
        {item.meetingTitle && (
          <div className="mb-3 max-lg:mt-4 min-w-0">
            <div className="text-[16px] font-extrabold text-foreground leading-tight line-clamp-2 break-words">
              {item.meetingTitle}
            </div>
          </div>
        )}

        {/* Meeting Description */}
        {item.meetingDescription && (
          <div className="mb-4 max-lg:mb-6 min-w-0">
            <div className="text-[12.5px] text-muted-foreground leading-relaxed break-words">
              {item.meetingDescription}
            </div>
          </div>
        )}

        {withdrawn &&
          (item.requesterArchiveReason || item.requesterArchiveNotes) && (
            <div className="mb-4 rounded-xl border border-border bg-muted/40 p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold text-foreground mb-2">
                <Archive className="h-4 w-4 text-muted-foreground" />
                Withdrawal details
              </div>
              {item.requesterArchiveReason ? (
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Reason: </span>
                  {labelRequesterArchiveReason(item.requesterArchiveReason)}
                </p>
              ) : null}
              {item.requesterArchiveNotes ? (
                <p className="mt-2 text-foreground whitespace-pre-wrap break-words">
                  {item.requesterArchiveNotes}
                </p>
              ) : null}
            </div>
          )}

        {/* Requester -> Prospect panels (reused from Inbox) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-sm:gap-4 md:gap-4 lg:gap-6 items-start mb-2">
          <InboxCardRequester
            request={adaptedRequest}
            requesterName={item.requester}
            setSelectedRequesterDetails={() => {}}
            setIsRequesterPopupOpen={() => {}}
            handleViewReviews={handleViewReviews}
          />

          <InboxCardProspect
            request={adaptedRequest}
            contactFullName={item.target}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col justify-between px-4 min-w-0">
        <div className="w-full">
          {/* Additional Context */}
          {item.purpose && item.purpose !== "No message provided" && (
            <div className="relative overflow-hidden rounded-xl bg-brand-sky/5 border border-brand-sky/20 p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-brand-sky flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold mb-1 text-brand-sky">
                    Additional Context
                  </h4>
                  <p className="text-xs text-muted-foreground break-words">
                    {item.purpose}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer: Action Buttons */}
        <div
          className="mt-4 pt-4 border-t border-dashed border-border flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            aria-label="View payout"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPayout({ item });
            }}
            className="h-10 gap-1.5 rounded-lg border-0 bg-brand-success px-6 py-2.5 text-[13px] font-bold text-brand-foreground shadow-lg shadow-brand-success/30 transition-all hover:-translate-y-0.5 hover:bg-brand-success/90 w-full sm:w-auto max-sm:min-h-[44px]"
          >
            <Coins className="h-4 w-4 flex-shrink-0" />
            <span>View Payout</span>
          </Button>

          <Button
            variant="outline"
            type="button"
            aria-label="Email insights"
            onClick={(e) => {
              e.stopPropagation();
              onOpenEmailInsights({ introductionRequestId: item.id });
            }}
            className="h-10 gap-1.5 rounded-lg border-border bg-card px-6 py-2.5 text-[13px] font-bold text-foreground hover:border-brand-amethyst/40 hover:bg-brand-amethyst/10 hover:text-brand-amethyst w-full sm:w-auto max-sm:min-h-[44px]"
          >
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span>Email Insights</span>
          </Button>

          <Button
            variant="outline"
            type="button"
            aria-label="View details"
            onClick={() => {
              onOpenDetails({
                item,
                withdrawn,
                archiveEventDate,
                bountyAmount,
              });
            }}
            className="h-10 gap-1.5 rounded-lg border-border bg-card px-6 py-2.5 text-[13px] font-bold text-foreground hover:border-brand-sky/40 hover:bg-brand-sky/10 hover:text-brand-sky w-full sm:w-auto max-sm:min-h-[44px]"
          >
            <MessageSquare className="h-4 w-4 flex-shrink-0" />
            <span>View Details</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const renderStandardHistoryItem = ({
  item,
  showOnlyCompleted,
  onOpenPayout,
  onOpenDetails,
  statusDisplayFns,
}: StandardHistoryItemRenderParams) => (
  <Card
    key={item.id}
    className="group relative overflow-hidden border-2 hover:border-primary/30 transition-all hover:shadow-2xl hover:-translate-y-1"
  >
    {/* Gradient overlay on hover */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

    {/* Status indicator line on left */}
    <div
      className={cn(
        "absolute left-0 top-0 bottom-0 w-1.5 transition-all",
        item.status === "completed" &&
          "bg-gradient-to-b from-green-500 to-emerald-600",
        item.status === "archived" &&
          "bg-gradient-to-b from-slate-500 to-slate-600",
        item.status === "awaiting_response" &&
          "bg-gradient-to-b from-yellow-500 to-amber-600",
        item.status === "meeting_scheduled" &&
          "bg-gradient-to-b from-blue-500 to-cyan-600",
        item.status === "declined" &&
          "bg-gradient-to-b from-red-500 to-rose-600"
      )}
    />

    <CardContent className="p-6 pl-8 relative">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Main Content Area */}
        <div className="space-y-5">
          {/* Header with Type & Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                "font-bold border-2",
                item.type === "given"
                  ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-700 hover:text-blue-50"
                  : "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-700 hover:text-purple-50"
              )}
            >
              <UserCheck className="h-3.5 w-3.5 mr-1.5" />
              {item.type === "given"
                ? "Introduction Given"
                : "Introduction Requested"}
            </Badge>

            {/* Only show status badge when not in Archive view (showOnlyCompleted) */}
            {!showOnlyCompleted && (
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs border-2",
                  item.status === "awaiting_response" &&
                    "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-700 hover:text-yellow-50",
                  item.status === "meeting_scheduled" &&
                    "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-700 hover:text-blue-50",
                  item.status === "completed" &&
                    "border-green-300 bg-green-50 text-green-700 hover:bg-green-700 hover:text-green-50",
                  item.status === "archived" &&
                    "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-700 hover:text-slate-50",
                  item.status === "declined" &&
                    "border-red-300 bg-red-50 text-red-700 hover:bg-red-700 hover:text-red-50"
                )}
              >
                {statusDisplayFns.getStatusIcon(item.status)}
                {statusDisplayFns.getStatusText(item.status)}
              </div>
            )}
          </div>

          {/* People Cards - Enhanced Two-Column */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Requester Card */}
            <div className="relative overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-5 shadow-md group/person hover:shadow-lg transition-all">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/person:translate-x-full transition-transform duration-1000" />

              <div className="relative space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
                  Requester
                </p>

                <div className="flex items-center gap-3">
                  <PremiumAvatar
                    name={item.requester}
                    size="md"
                    qualityScore={8}
                    imageUrl={item.requesterPhotoUrl}
                  />

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base leading-tight">
                      {item.requester}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="truncate">{item.requesterCompany}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Card */}
            <div className="relative overflow-hidden rounded-xl border-2 border-secondary/20 bg-gradient-to-br from-secondary/10 to-secondary/5 p-5 shadow-md group/person hover:shadow-lg transition-all">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/person:translate-x-full transition-transform duration-1000" />

              <div className="relative space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
                  Target Contact
                </p>

                <div className="flex items-center gap-3">
                  <PremiumAvatar
                    name={item.target}
                    size="md"
                    qualityScore={7}
                    imageUrl={item.targetPhotoUrl}
                  />

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base leading-tight">
                      {item.target}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="truncate">{item.targetCompany}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bounty & Timeline Section - Enhanced */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border-2 border-amber-500/20 p-5 shadow-md">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />

            <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Bounty */}
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 shadow-sm">
                  <DollarSign className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Referral Payout
                  </p>
                  <p className="text-2xl font-black text-amber-600">
                    ${item.bounty.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Sent Date */}
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/10 shadow-sm">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Sent
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {formatMeetingDate(item.sentDate)}
                  </p>
                </div>
              </div>

              {/* Last Activity */}
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/10 shadow-sm">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Last Activity
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {item.lastActivity}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Meeting Info (conditional) */}
          {item.status === "meeting_scheduled" && item.meetingDate && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-2 border-green-500/20 shadow-sm">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs font-bold text-green-900 uppercase tracking-wide">
                    Meeting Scheduled
                  </p>
                  <p className="text-sm text-green-700 font-medium mt-0.5">
                    {item.meetingDate}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Action Panel */}
        <div className="flex flex-col gap-3 lg:border-l lg:pl-6 lg:border-muted">
          <Button
            variant="default"
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg hover:shadow-xl transition-all group/btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPayout({ item });
            }}
          >
            <Coins className="h-4 w-4 mr-2 group-hover/btn:rotate-12 transition-transform" />
            <span>View Payout</span>
          </Button>

          <Button
            variant="default"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all group/btn"
            onClick={() => {
              const { withdrawn, archiveEventDate } =
                getHistoryItemArchiveContext({
                  item,
                });
              const bountyAmount = getHistoryItemBountyAmount({ item });

              onOpenDetails({
                item,
                withdrawn,
                archiveEventDate,
                bountyAmount,
              });
            }}
          >
            <MessageSquare className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
            <span>View Details</span>
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

const renderHistoryItem = ({
  item,
  showOnlyCompleted,
  handleViewReviews,
  onOpenPayout,
  onOpenEmailInsights,
  onOpenDetails,
  statusDisplayFns,
}: HistoryItemRenderParams) => {
  if (showOnlyCompleted) {
    return renderArchiveHistoryItem({
      item,
      handleViewReviews,
      onOpenPayout,
      onOpenEmailInsights,
      onOpenDetails,
    });
  }

  return renderStandardHistoryItem({
    item,
    showOnlyCompleted,
    onOpenPayout,
    onOpenDetails,
    statusDisplayFns,
  });
};

export function ActivityTab({
  showOnlyCompleted = false,
  search = "",
  emailLinkParams = null,
  onEmailLinkHandled,
}: ActivityTabProps) {
  const { currentUser } = useCurrentUser();
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<RequestedIntroduction | null>(null);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [selectedIntroForTransactions, setSelectedIntroForTransactions] =
    useState<HistoryItem | null>(null);
  const [emailTrackingModalOpen, setEmailTrackingModalOpen] = useState(false);
  const [selectedIntroForEmail, setSelectedIntroForEmail] = useState<
    string | null
  >(null);
  const [reviewsDialogOpen, setReviewsDialogOpen] = useState(false);
  const [selectedRequesterForReview, setSelectedRequesterForReview] = useState<{
    id?: string;
    name?: string;
    trustScore?: number;
  } | null>(null);
  const emailLinkHandledRef = useRef<string | null>(null);

  const handleViewReviews = (requester: {
    id?: string;
    name?: string;
    trustScore?: number;
  }) => {
    setSelectedRequesterForReview(requester);
    setReviewsDialogOpen(true);
  };

  const searchParam = search.trim() || undefined;

  // Fetch activity data from API (connector's archive)
  const { data: activityData, isPending: activityLoading } = useQuery<
    ActivityDataItem[]
  >({
    queryKey: [
      "/api/introduction-requests/introduction-pipeline/archive",
      { search: searchParam },
    ],
    enabled: !!currentUser?.id,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const mapStatus = (status?: string) => {
    switch (status) {
      case "meeting_scheduled":
        return "meeting_scheduled";
      case "meeting_completed":
      case "completed":
        return "completed";
      case "archived":
        return "archived";
      case "declined":
        return "declined";
      default:
        return "awaiting_response";
    }
  };

  // Transform API data to match component interface
  const historyItems: HistoryItem[] = (activityData || []).map(
    (item: ActivityDataItem) => {
      const withdrawn = isIntroductionRequesterWithdrawn({
        stage: item.stage,
        status: item.status,
      });

      const lastActivityTimestamp =
        item.lastActivity ||
        item.updatedAt ||
        item.completedDate ||
        item.createdAt ||
        null;

      const lastActivity =
        lastActivityTimestamp &&
        toUTC(lastActivityTimestamp).toString() !== "Invalid Date"
          ? formatDistanceToNow(toUTC(lastActivityTimestamp), {
              addSuffix: true,
            })
          : "Recently";

      return {
        ...item,
        // Map field names to what component expects
        requester:
          item.requesterName === "Unknown" || !item.requesterName
            ? "User's Account deleted"
            : item.requesterName,
        requesterCompany: item.requesterCompany || "Unknown Company",
        target:
          item.targetName === "Unknown" || !item.targetName
            ? "User's Account deleted"
            : item.targetName,
        targetCompany: item.targetCompany || "Unknown Company",
        bounty:
          typeof item.bountyAmount === "string"
            ? item.bountyAmount
            : String(item.bountyAmount || "0"),
        type: "given", // Connector gave introductions
        sentDate: item.completedDate || item.lastActivity,
        lastActivity,
        lastActivityTimestamp,
        status: mapStatus(item.stage || item.status),
        meetingDate: item.meetingDate,
        // Additional fields for modals
        prospectName: item.targetName,
        prospectCompany: item.targetCompany,
        prospectPhotoUrl: item.targetPhotoUrl, // Map targetPhotoUrl to prospectPhotoUrl for RequestDetailsModal
        connectorName: item.requesterName,
        connectorCompany: item.requesterCompany,
        requesterPhotoUrl: item.requesterPhotoUrl, // Pass through requesterPhotoUrl
        bountyAmount: item.bountyAmount,
        stage: withdrawn
          ? "archived"
          : item.stage || item.status || "request_accepted",
        nextAction: withdrawn ? "Archived" : "Completed",
        progress: withdrawn ? 0 : 100,
        rating: item.rating,
        feedbackComments: item.feedbackComments,
        purpose: item.purpose || "",
        meetingTitle: item.meetingTitle,
        meetingDescription: item.meetingDescription,
        requesterArchiveReason: item.requesterArchiveReason,
        requesterArchiveNotes: item.requesterArchiveNotes,
        requesterArchivedAt: item.requesterArchivedAt,
        requesterArchived: item.requesterArchived,
      };
    }
  );

  // Status color function - currently not used but kept for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getStatusColor = (status: string) => {
    switch (status) {
      case "awaiting_response":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-800 hover:text-yellow-100 border-yellow-200";
      case "meeting_scheduled":
        return "bg-blue-100 text-blue-800 hover:bg-blue-800 hover:text-blue-100 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-800 hover:text-green-100 border-green-200";
      case "archived":
        return "bg-slate-100 text-slate-800 hover:bg-slate-800 hover:text-slate-100 border-slate-200";
      case "declined":
        return "bg-red-100 text-red-800 hover:bg-red-800 hover:text-red-100 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-800 hover:text-gray-100 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "awaiting_response":
        return <Clock className="h-4 w-4" />;
      case "meeting_scheduled":
        return <Calendar className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "archived":
        return <Archive className="h-4 w-4" />;
      case "declined":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "awaiting_response":
        return "Awaiting Response";
      case "meeting_scheduled":
        return "Meeting Scheduled";
      case "completed":
        return "Completed";
      case "archived":
        return "Withdrawn by requester";
      case "declined":
        return "Declined";
      default:
        return status;
    }
  };

  const handleOpenPayout = ({ item }: { item: HistoryItem }) => {
    setSelectedIntroForTransactions(item);
    setTransactionModalOpen(true);
  };

  const handleOpenEmailInsights = ({
    introductionRequestId,
  }: {
    introductionRequestId: string;
  }) => {
    setSelectedIntroForEmail(introductionRequestId);
    setEmailTrackingModalOpen(true);
  };

  const handleOpenDetails = ({
    item,
    withdrawn,
    archiveEventDate,
    bountyAmount,
  }: HistoryItemDetailsParams) => {
    setSelectedRequest(
      buildRequestedIntroduction({
        item,
        withdrawn,
        archiveEventDate,
        bountyAmount,
      })
    );
    setDetailsModalOpen(true);
  };

  useEffect(() => {
    if (!emailLinkParams || activityLoading) {
      return;
    }
    if (
      emailLinkParams.action === "feedback" ||
      emailLinkParams.action === "review" ||
      emailLinkParams.action === "acknowledge"
    ) {
      return;
    }
    if (emailLinkHandledRef.current === emailLinkParams.requestId) {
      return;
    }

    const item = historyItems.find(
      (historyItem) => historyItem.id === emailLinkParams.requestId
    );
    if (!item) {
      return;
    }

    const bountyAmount = getHistoryItemBountyAmount({ item });
    const { withdrawn, archiveEventDate } = getHistoryItemArchiveContext({
      item,
    });

    emailLinkHandledRef.current = emailLinkParams.requestId;
    handleOpenDetails({
      item,
      withdrawn,
      archiveEventDate,
      bountyAmount,
    });
    onEmailLinkHandled?.();
  }, [emailLinkParams, activityLoading, historyItems, onEmailLinkHandled]);

  return (
    <div className="space-y-6">
      {/* Header - Only show in Activity view, not in Archive */}
      {!showOnlyCompleted && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">
              Introduction Activity
            </h2>
            <p className="text-muted-foreground">
              View all introduction activity and track progress
            </p>
          </div>
        </div>
      )}

      {/* History Items */}
      <div
        className={
          showOnlyCompleted
            ? "grid grid-cols-1 gap-4 xl:grid-cols-2 items-start"
            : "space-y-4"
        }
      >
        {historyItems.map((item) =>
          renderHistoryItem({
            item,
            showOnlyCompleted,
            handleViewReviews,
            onOpenPayout: handleOpenPayout,
            onOpenEmailInsights: handleOpenEmailInsights,
            onOpenDetails: handleOpenDetails,
            statusDisplayFns: {
              getStatusIcon,
              getStatusText,
            },
          })
        )}
      </div>

      {/* Details Modal */}
      <RequestDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        request={selectedRequest}
        isRequester={false}
      />

      {/* Payout Details Modal */}
      <PayoutDetailsModal
        open={transactionModalOpen}
        onOpenChange={setTransactionModalOpen}
        introductionRequestId={selectedIntroForTransactions?.id || ""}
        prospectName={selectedIntroForTransactions?.target}
      />

      {/* Email Tracking Modal */}
      <EmailTrackingModal
        isOpen={emailTrackingModalOpen}
        onClose={() => {
          setEmailTrackingModalOpen(false);
          setSelectedIntroForEmail(null);
        }}
        introductionRequestId={selectedIntroForEmail || ""}
      />

      {/* Reviews Dialog */}
      {selectedRequesterForReview && (
        <ReviewsDialog
          open={reviewsDialogOpen}
          onOpenChange={setReviewsDialogOpen}
          connectorName={selectedRequesterForReview.name || "Requester"}
          trustScore={selectedRequesterForReview.trustScore || 0}
          userId={selectedRequesterForReview.id}
        />
      )}
    </div>
  );
}
