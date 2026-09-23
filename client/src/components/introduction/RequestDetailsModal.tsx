import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { utcDayjs } from "@/lib/dayjs";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useDisputes } from "@/hooks/useDisputes";
import { type DetectedIssue } from "@/utils/disputeDetection";
import { useAuth } from "@/contexts/AuthContext";

import { useQueryClient } from "@tanstack/react-query";
import {
  formatMeetingDate,
  formatMeetingDateWithTimezone,
  formatLastActivity,
} from "@/utils/dateFormatting";
import {
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Flag,
  Eye,
  Scale,
  Star,
  Archive,
  XCircle,
} from "lucide-react";
import { DisputeAlert } from "./DisputeAlert";
import { IntroPersonCard } from "./IntroPersonCard";
import {
  labelRequesterArchiveReason,
  isIntroductionRequesterWithdrawn,
  toSafeHttpUrl,
} from "./introductionHelpers";
import { StarRating } from "@/components/shared/StarRating";
import { LeaveFeedbackModal } from "./LeaveFeedbackModal";
import { ReviewsDialog } from "./ReviewsDialog";
import { ArchiveRequesterIntroductionModal } from "./ArchiveRequesterIntroductionModal";
import { DrawerSection, PayoutHero, MetaStrip } from "./DrawerSections";
import { RequesterFeeBreakdown } from "./RequesterFeeBreakdown";

/** 5% / 95% of fee-inclusive total (matches server calculateSplitAmounts). */
function splitRequesterMilestoneFromTotal(total: number) {
  const totalCents = Math.round(total * 100);
  const initialCents = Math.floor((totalCents * 5) / 100);
  return {
    initial: initialCents / 100,
    remaining: (totalCents - initialCents) / 100,
  };
}

function getRequesterStoredFeeDisplay(request: RequestedIntroduction) {
  const storedTotalAmount = Number(request.totalAmount ?? 0);
  const hasStoredRequesterFees = storedTotalAmount > 0;
  const hasCompleteStoredFees =
    hasStoredRequesterFees &&
    request.providerFee != null &&
    request.processingFee != null;
  const milestoneFromTotal = hasStoredRequesterFees
    ? splitRequesterMilestoneFromTotal(storedTotalAmount)
    : null;
  const bountyMilestoneFallback = splitRequesterMilestoneFromTotal(
    request.bountyAmount ?? 0
  );
  return {
    hasStoredRequesterFees,
    hasCompleteStoredFees,
    displayInitialCharge:
      milestoneFromTotal?.initial ??
      request.initialChargeAmount ??
      bountyMilestoneFallback.initial,
    displayRemainingCharge:
      milestoneFromTotal?.remaining ??
      request.remainingChargeAmount ??
      bountyMilestoneFallback.remaining,
  };
}

interface RequestedIntroduction {
  id: string;
  prospectName: string;
  prospectCompany: string;
  prospectPhotoUrl?: string | null;
  connectorName: string | null;
  connectorCompany: string;
  connectorPhotoUrl?: string | null;
  connectorId?: string; // For Reviews button
  requesterName?: string;
  requesterCompany?: string;
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
    | "meeting_rescheduled"
    | "awaiting_connector"
    | "awaiting_intro"
    | "archived";
  lastActivity: string;
  lastActivityTimestamp?: string; // Raw timestamp for conditional formatting
  nextAction: string;
  progress: number;
  meetingDate?: string;
  meetingStartTime?: string; // Full ISO datetime from scheduled_meetings table
  meetingTimezone?: string; // Timezone from scheduled_meetings table
  meetingLink?: string | null;
  rating?: number;
  feedbackComments?: string;
  purpose: string;
  meetingTitle?: string | null;
  meetingDescription?: string | null;
  additionalContext?: string | null;
  // Transaction data for 5%/95% payment split display
  initialChargeAmount?: number | null;
  initialChargeCaptured?: boolean;
  initialChargeCapturedAt?: string | null;
  remainingChargeAmount?: number | null;
  remainingChargeCaptured?: boolean;
  remainingChargeCapturedAt?: string | null;
  platformCommissionAmount?: number | null;
  // Error visibility - only show payment errors to requester
  initialPaymentStatus?: string | null;
  remainingPaymentStatus?: string | null;
  // Prospect details
  prospectTitle?: string | null;
  prospectIndustry?: string | null;
  prospectLinkedinUrl?: string | null;
  prospectLocation?: string | null;
  prospectEmployees?: string | null;
  prospectCompanyIndustry?: string | null;
  prospectCompanyDescription?: string | null;
  prospectLinkedinConnections?: string | null;
  // Connector details
  connectorTitle?: string | null;
  connectorIndustry?: string | null;
  connectorLinkedinUrl?: string | null;
  connectorLocation?: string | null;
  connectorTrustScore?: number;
  connectorEmail?: string | null;
  connectorWebsiteUrl?: string | null;
  connectorPhone?: string | null;
  connectorBio?: string | null;
  connectorProducts?: string | null;
  connectorUniqueSellingProposition?: string | null;
  connectorTargetMarket?: string | null;
  connectorCompanySize?: string | null;
  connectorRevenueRange?: string | null;
  connectorKeyCredentials?: string | null;
  // Prospect contact fields
  prospectEmail?: string | null;
  prospectWebsiteUrl?: string | null;
  prospectCompanyLinkedinUrl?: string | null;
  prospectPhone?: string | null;
  prospectBio?: string | null;
  potentialConnectors?: {
    totalCount: number;
    pendingCount: number;
    declinedCount: number;
    hasAccepted: boolean;
  } | null;
  needsRepublish?: boolean;
  canRequesterArchive?: boolean;
  requesterArchiveBlockedByClaim?: boolean;
  requesterArchived?: boolean;
  requesterArchiveReason?: string | null;
  requesterArchiveNotes?: string | null;
  requesterArchivedAt?: string | null;
}

interface ExistingFeedback {
  id: string;
  rating: number;
  feedback_text: string;
  meeting_completed: boolean;
}

interface RequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RequestedIntroduction | null;
  isRequester?: boolean;
}

// Utility functions moved to introductionHelpers.ts

function isArchivedRequestDetailsRequest({
  request,
}: {
  request: RequestedIntroduction;
}): boolean {
  return (
    (request.progress === 100 && request.nextAction === "Completed") ||
    !!request.requesterArchived ||
    request.stage === "archived"
  );
}

function hasRequestDetailsFeedbackData({
  request,
}: {
  request: RequestedIntroduction;
}): boolean {
  const hasRating = request.rating !== undefined && request.rating !== null;
  const hasComments =
    request.feedbackComments !== undefined &&
    request.feedbackComments !== null &&
    request.feedbackComments !== "";
  return hasRating || hasComments;
}

function shouldFetchRequestDetailsFeedback({
  request,
}: {
  request: RequestedIntroduction;
}): boolean {
  const isFeedbackStage =
    request.stage === "meeting_completed" || request.stage === "peer_feedback";
  if (!isFeedbackStage || isArchivedRequestDetailsRequest({ request })) {
    return false;
  }
  return !hasRequestDetailsFeedbackData({ request });
}

function findOpenDisputeForRequest({
  disputes,
  requestId,
}: {
  disputes: Array<{
    id: string;
    introductionRequestId: string;
    status: string;
  }>;
  requestId: string;
}) {
  return disputes.find(
    (dispute) =>
      dispute.introductionRequestId === requestId &&
      (dispute.status === "pending" || dispute.status === "under_review")
  );
}

function getCommissionAmount(bountyAmount: number) {
  return Math.round(bountyAmount * 0.2);
}

function RequestDetailsEmpty({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <SheetTitle className="sr-only">Introduction Request Details</SheetTitle>
      <div className="space-y-4 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Unable to load request details</p>
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      </div>
    </div>
  );
}

function RequestDetailsSheetHero() {
  return (
    <section className="relative overflow-hidden bg-brand-hero-gradient px-5 py-6 text-white shadow-brand-card sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
      />
      <div className="relative pr-10">
        <SheetTitle className="text-lg font-semibold leading-tight text-white">
          Introduction Request Details
        </SheetTitle>
        <SheetDescription className="mt-1 text-[13px] text-white/85">
          Track this introduction's people, payout, and progress.
        </SheetDescription>
      </div>
    </section>
  );
}

function RequesterWithdrawnBanner({
  request,
}: {
  request: RequestedIntroduction;
}) {
  if (
    !isIntroductionRequesterWithdrawn({ stage: request.stage }) ||
    (!request.requesterArchiveReason && !request.requesterArchiveNotes)
  ) {
    return null;
  }
  return (
    <div className="rounded-2xl border border-border bg-muted/60 p-4 text-sm">
      <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
        <Archive className="h-4 w-4 text-muted-foreground" />
        Requester withdrew this introduction
      </div>
      {request.requesterArchiveReason ? (
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Reason: </span>
          {labelRequesterArchiveReason(request.requesterArchiveReason)}
        </p>
      ) : null}
      {request.requesterArchiveNotes ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-foreground">
          {request.requesterArchiveNotes}
        </p>
      ) : null}
    </div>
  );
}

function RequestDetailsPeopleGrid({
  request,
  handleViewReviews,
}: {
  request: RequestedIntroduction;
  handleViewReviews: (connector: {
    id?: string;
    name?: string;
    trustScore?: number;
  }) => void;
}) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
      <IntroPersonCard
        role="connector"
        stage={request.stage}
        potentialConnectors={request.potentialConnectors}
        handleViewReviews={handleViewReviews}
        person={{
          id: request.connectorId,
          name: request.connectorName || undefined,
          trustScore: request.connectorTrustScore,
          photoUrl: request.connectorPhotoUrl,
          title: request.connectorTitle,
          industry: request.connectorIndustry,
          company: request.connectorCompany,
          location: request.connectorLocation,
          email: request.connectorEmail,
          linkedinUrl: request.connectorLinkedinUrl,
          websiteUrl: request.connectorWebsiteUrl,
        }}
      />
      <IntroPersonCard
        role="prospect"
        person={{
          name: request.prospectName,
          photoUrl: request.prospectPhotoUrl,
          title: request.prospectTitle,
          industry: request.prospectIndustry,
          company: request.prospectCompany,
          employees: request.prospectEmployees,
          location: request.prospectLocation,
          linkedinConnections: request.prospectLinkedinConnections,
          email: request.prospectEmail,
          linkedinUrl: request.prospectLinkedinUrl,
          websiteUrl: request.prospectWebsiteUrl,
          companyLinkedinUrl: request.prospectCompanyLinkedinUrl,
        }}
      />
    </div>
  );
}

function RequestOptionalTextSections({
  request,
}: {
  request: RequestedIntroduction;
}) {
  return (
    <>
      {request.meetingTitle && (
        <DrawerSection
          icon={<Calendar className="h-4 w-4" />}
          iconTint="bg-brand-sky/10 text-brand-sky"
          title="Meeting Title"
        >
          <p className="break-words text-sm font-semibold leading-relaxed">
            {request.meetingTitle}
          </p>
        </DrawerSection>
      )}
      {request.meetingDescription && (
        <DrawerSection
          icon={<TrendingUp className="h-4 w-4" />}
          iconTint="bg-brand-amethyst/10 text-brand-amethyst"
          title="Meeting Description"
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {request.meetingDescription}
          </p>
        </DrawerSection>
      )}
      {request.additionalContext && (
        <DrawerSection
          icon={<TrendingUp className="h-4 w-4" />}
          iconTint="bg-brand-amethyst/10 text-brand-amethyst"
          title="Additional Context"
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
            {request.additionalContext}
          </p>
        </DrawerSection>
      )}
      {request.purpose && !request.meetingDescription && (
        <DrawerSection
          icon={<TrendingUp className="h-4 w-4" />}
          iconTint="bg-brand-amethyst/10 text-brand-amethyst"
          title="Purpose"
        >
          <p className="break-words text-sm leading-relaxed text-muted-foreground">
            {request.purpose}
          </p>
        </DrawerSection>
      )}
    </>
  );
}

function RequestSubmittedReview({
  request,
}: {
  request: RequestedIntroduction;
}) {
  if (!request.rating) return null;
  return (
    <section className="rounded-2xl border border-brand-warning/30 bg-brand-warning/10 p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-brand-warning/15 text-brand-warning">
          <Star className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold">Your Submitted Review</h3>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <StarRating rating={request.rating} size="lg" colorScheme="amber" />
          <span className="ml-1 text-sm font-bold text-brand-warning">
            {request.rating.toFixed(1)}
          </span>
        </div>
        {request.feedbackComments && (
          <p className="mt-2 rounded-lg border border-brand-warning/20 bg-card p-3 text-sm leading-relaxed text-foreground">
            "{request.feedbackComments}"
          </p>
        )}
      </div>
    </section>
  );
}

function buildRequesterMetaCells(request: RequestedIntroduction) {
  const { displayInitialCharge, displayRemainingCharge } =
    getRequesterStoredFeeDisplay(request);
  return [
    {
      label: request.initialChargeCaptured
        ? "Intro Sent (5%)"
        : "On Intro Sent (5%)",
      value: `$${displayInitialCharge.toLocaleString()}`,
      icon: request.initialChargeCaptured ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      ),
      tint: request.initialChargeCaptured
        ? "bg-brand-success/10 text-brand-success"
        : "bg-muted text-muted-foreground",
      alert: request.initialPaymentStatus === "failed",
    },
    {
      label: request.remainingChargeCaptured
        ? "Meeting Booked (95%)"
        : "On Meeting Booked (95%)",
      value: `$${displayRemainingCharge.toLocaleString()}`,
      icon: request.remainingChargeCaptured ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      ),
      tint: request.remainingChargeCaptured
        ? "bg-brand-success/10 text-brand-success"
        : "bg-muted text-muted-foreground",
      alert: request.remainingPaymentStatus === "failed",
    },
  ];
}

function buildConnectorMetaCells(request: RequestedIntroduction) {
  const commission =
    request.platformCommissionAmount ??
    getCommissionAmount(request.bountyAmount);
  return [
    {
      label: "Your Earnings (80%)",
      value: `$${(request.bountyAmount - commission).toLocaleString()}`,
      icon: <CheckCircle className="h-4 w-4" />,
      tint: "bg-brand-success/10 text-brand-success",
    },
    {
      label: "Full Payout",
      value: `$${request.bountyAmount.toLocaleString()}`,
      icon: <DollarSign className="h-4 w-4" />,
      tint: "bg-brand-amethyst/10 text-brand-amethyst",
    },
  ];
}

function RequestPayoutSection({
  request,
  isRequester,
}: {
  request: RequestedIntroduction;
  isRequester: boolean;
}) {
  const {
    hasStoredRequesterFees,
    hasCompleteStoredFees,
    displayInitialCharge,
    displayRemainingCharge,
  } = getRequesterStoredFeeDisplay(request);
  const cells = isRequester
    ? buildRequesterMetaCells(request)
    : buildConnectorMetaCells(request);
  return (
    <>
      <PayoutHero
        label="Total Referral Payout"
        value={`$${request.bountyAmount.toLocaleString()}`}
        note={
          isRequester
            ? hasStoredRequesterFees
              ? "Card processing fees are included in your total charge (below), not in the referral payout. Charged in two parts — 5% when the intro is sent, 95% when the meeting is booked."
              : "Charged in two parts as the introduction progresses — 5% when the intro is sent, 95% when the meeting is booked."
            : "You earn 80% of this payout once the meeting is booked."
        }
      />
      {isRequester && hasCompleteStoredFees && (
        <DrawerSection
          icon={<DollarSign className="h-4 w-4" />}
          iconTint="bg-brand-success/10 text-brand-success"
          title="Payment breakdown"
        >
          <RequesterFeeBreakdown
            referralPayout={request.bountyAmount}
            providerFee={request.providerFee ?? null}
            processingFee={request.processingFee ?? null}
            totalAmount={request.totalAmount ?? null}
            initialChargeAmount={displayInitialCharge}
            remainingChargeAmount={displayRemainingCharge}
            showMilestones={false}
          />
        </DrawerSection>
      )}
      <MetaStrip cells={cells} />
    </>
  );
}

function RequestActivitySection({
  request,
}: {
  request: RequestedIntroduction;
}) {
  const lastActivityLabel =
    request.lastActivityTimestamp && request.lastActivity
      ? formatLastActivity(request.lastActivityTimestamp, request.lastActivity)
      : request.lastActivity || "N/A";

  return (
    <DrawerSection
      icon={<Clock className="h-4 w-4" />}
      iconTint="bg-brand-sky/10 text-brand-sky"
      title="Activity"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 break-words text-[13px]">
          <span className="min-w-[35px] flex-shrink-0 font-medium text-muted-foreground">
            Last:
          </span>
          <span className="font-semibold italic text-foreground">
            {lastActivityLabel}
          </span>
        </div>
        <div className="flex items-start gap-2 text-[13px]">
          <span className="min-w-[35px] flex-shrink-0 pt-2 font-medium text-muted-foreground">
            Next:
          </span>
          <div className="inline-flex min-w-0 items-center break-words rounded-xl border border-border bg-muted/50 px-3.5 py-2.5">
            <span className="break-words text-[13px] font-medium leading-snug text-muted-foreground">
              {request.nextAction}
            </span>
          </div>
        </div>
      </div>
    </DrawerSection>
  );
}

function getMeetingScheduleLabel(request: RequestedIntroduction) {
  if (request.stage === "meeting_rescheduled") {
    return "Rescheduled - Awaiting new time";
  }
  if (request.meetingStartTime) {
    return formatMeetingDateWithTimezone(request.meetingStartTime);
  }
  if (request.meetingDate) {
    return formatMeetingDate(request.meetingDate);
  }
  return "Not scheduled";
}

function RequestMeetingDetailsSection({
  request,
  meetingPastDue,
  meetingUpcoming,
  safeMeetingLink,
}: {
  request: RequestedIntroduction;
  meetingPastDue: boolean;
  meetingUpcoming: boolean;
  safeMeetingLink: string | null;
}) {
  const showSection =
    request.stage === "meeting_rescheduled" ||
    request.meetingStartTime ||
    request.meetingDate ||
    request.meetingLink;
  if (!showSection) return null;

  const showJoinLink =
    !!safeMeetingLink &&
    request.stage !== "meeting_rescheduled" &&
    meetingUpcoming;

  return (
    <DrawerSection
      icon={<Calendar className="h-4 w-4" />}
      iconTint="bg-brand-sky/10 text-brand-sky"
      title="Meeting Details"
    >
      <div className="space-y-2 text-sm font-medium">
        <div
          className={meetingPastDue ? "font-bold text-brand-destructive" : ""}
        >
          {getMeetingScheduleLabel(request)}
        </div>
        {meetingPastDue && (
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-destructive">
            <AlertTriangle className="h-3 w-3" />
            Needs Rescheduling
          </div>
        )}
        {showJoinLink && (
          <div className="flex items-center gap-2">
            <a
              href={safeMeetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-success hover:underline"
            >
              Join Meeting
            </a>
          </div>
        )}
      </div>
    </DrawerSection>
  );
}

function RequestDisputeSections({
  isRequester,
  detectedIssue,
  canDispute,
  activeDispute,
  onFileDispute,
  onViewDispute,
}: {
  isRequester: boolean;
  detectedIssue: DetectedIssue | null;
  canDispute: boolean;
  activeDispute: boolean;
  onFileDispute: () => void;
  onViewDispute: () => void;
}) {
  if (!isRequester) return null;
  return (
    <>
      {detectedIssue && (
        <DisputeAlert
          issue={detectedIssue}
          onFileDispute={canDispute ? onFileDispute : undefined}
        />
      )}
      {canDispute && !activeDispute && !detectedIssue && (
        <section className="rounded-2xl border border-brand-destructive/30 bg-brand-destructive/10 p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-brand-destructive">
            <AlertTriangle className="h-4 w-4" />
            Having Issues?
          </div>
          <p className="mb-3 text-sm text-brand-destructive/90">
            If there's a problem with this introduction request, you can file a
            dispute.
          </p>
          <Button variant="destructive" size="sm" onClick={onFileDispute}>
            <Flag className="mr-2 h-4 w-4" />
            File Dispute
          </Button>
        </section>
      )}
      {activeDispute && (
        <section className="rounded-2xl border border-brand-warning/30 bg-brand-warning/10 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 flex-shrink-0 text-brand-warning" />
              <div>
                <p className="font-medium text-foreground">Dispute Filed</p>
                <p className="text-sm text-muted-foreground">
                  This request has an active dispute under review
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onViewDispute}>
              <Eye className="mr-2 h-4 w-4" />
              View Dispute
            </Button>
          </div>
        </section>
      )}
    </>
  );
}

function RequestWithdrawFooter({
  onWithdrawClick,
}: {
  onWithdrawClick: () => void;
}) {
  return (
    <div className="border-t bg-background">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-6 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
        <p className="flex-1 text-xs text-muted-foreground">
          Withdrawing stops the request. Captured charges are refunded where
          applicable; uncaptured holds are released.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onWithdrawClick}
          className="w-full border-brand-destructive/40 text-brand-destructive hover:bg-brand-destructive/10 hover:text-brand-destructive sm:w-auto"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Withdraw
        </Button>
      </div>
    </div>
  );
}

function RequestDetailsScrollContent({
  request,
  isRequester,
  handleViewReviews,
  detectedIssue,
  canDispute,
  activeDispute,
  onFileDispute,
  onViewDispute,
  meetingPastDue,
  meetingUpcoming,
  safeMeetingLink,
}: {
  request: RequestedIntroduction;
  isRequester: boolean;
  handleViewReviews: (connector: {
    id?: string;
    name?: string;
    trustScore?: number;
  }) => void;
  detectedIssue: DetectedIssue | null;
  canDispute: boolean;
  activeDispute: boolean;
  onFileDispute: () => void;
  onViewDispute: () => void;
  meetingPastDue: boolean;
  meetingUpcoming: boolean;
  safeMeetingLink: string | null;
}) {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <RequesterWithdrawnBanner request={request} />
      <RequestDetailsPeopleGrid
        request={request}
        handleViewReviews={handleViewReviews}
      />
      <RequestOptionalTextSections request={request} />
      <RequestSubmittedReview request={request} />
      <RequestPayoutSection request={request} isRequester={isRequester} />
      <RequestActivitySection request={request} />
      <RequestMeetingDetailsSection
        request={request}
        meetingPastDue={meetingPastDue}
        meetingUpcoming={meetingUpcoming}
        safeMeetingLink={safeMeetingLink}
      />
      <RequestDisputeSections
        isRequester={isRequester}
        detectedIssue={detectedIssue}
        canDispute={canDispute}
        activeDispute={activeDispute}
        onFileDispute={onFileDispute}
        onViewDispute={onViewDispute}
      />
    </div>
  );
}

export function RequestDetailsModal({
  isOpen,
  onClose,
  request,
  isRequester = true,
}: RequestDetailsModalProps) {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [existingFeedback, setExistingFeedback] =
    useState<ExistingFeedback | null>(null);
  const [feedbackToUserId, setFeedbackToUserId] = useState<string>("");
  const [feedbackToUserName, setFeedbackToUserName] = useState<string>("");
  const [reviewsDialogOpen, setReviewsDialogOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [selectedConnectorForReview, setSelectedConnectorForReview] = useState<{
    id?: string;
    name?: string;
    trustScore?: number;
  } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasActiveDispute, detectIssues, checkCanFileDispute, disputes } =
    useDisputes(request?.id);
  const { user } = useAuth();
  // Track if we've already fetched introduction details to prevent duplicate calls
  const hasFetchedDetailsRef = useRef<string | null>(null);
  // Check for issues and dispute eligibility - handle null request
  const detectedIssue = request ? detectIssues(request) : null;
  const canDispute = request ? checkCanFileDispute(request) : false;
  const activeDispute = request ? hasActiveDispute(request.id) : false;

  // Fetch introduction details function
  // Note: /api/introductions/:id endpoint has been removed from backend
  // Using local data and fallback to profile API for missing information
  const fetchIntroductionDetails = async () => {
    if (!user?.id || !request?.id) return;

    // Set feedback user info using local request data
    if (request && isRequester) {
      // Use connector name from request data as fallback
      setFeedbackToUserName(request.connectorName || "");
    }
  };

  // Fetch existing feedback function
  const fetchExistingFeedback = async () => {
    if (!user?.id || !request?.id) return;

    try {
      const response = await fetch(
        `/api/introduction-requests/${request.id}/feedback?feedbackType=meeting_feedback`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const result = await response.json();
        // Handle nested data property if present, otherwise use result as data
        const data = result.data || result;

        // Map backend camelCase to frontend snake_case expected by LeaveFeedbackModal
        setExistingFeedback({
          id: data.id,
          rating: Number(data.rating),
          feedback_text: data.feedback_text ?? data.feedbackText ?? "",
          meeting_completed:
            data.meeting_completed ?? data.meetingCompleted ?? false,
        });
      }
    } catch {
      // Error is silently handled - existingFeedback will remain null
    }
  };

  const handleFileDispute = () => {
    navigate("/prospecting/transactions/disputes");
    onClose();
  };

  const handleViewDispute = () => {
    if (!request) return;
    const dispute = findOpenDisputeForRequest({
      disputes,
      requestId: request.id,
    });

    if (dispute) {
      navigate(`/prospecting/transactions/disputes?disputeId=${dispute.id}`);
    } else {
      // Fallback if dispute not found in current list
      navigate("/prospecting/transactions/disputes");
    }
    onClose();
  };

  // Fetch data when modal opens - consolidated to prevent duplicate API calls
  useEffect(() => {
    if (!request || !user?.id || !isOpen) {
      // Reset the ref when modal closes
      if (!isOpen) {
        hasFetchedDetailsRef.current = null;
      }
      return;
    }

    // Prevent duplicate calls - only fetch if we haven't fetched for this request ID
    if (hasFetchedDetailsRef.current === request.id) {
      return;
    }

    // Mark that we're fetching for this request ID
    hasFetchedDetailsRef.current = request.id;

    // Fetch introduction details only once per request
    // This will also try to fetch requester company if needed
    fetchIntroductionDetails();

    if (shouldFetchRequestDetailsFeedback({ request })) {
      fetchExistingFeedback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    request?.id,
    user?.id,
    isOpen,
    isRequester,
    request?.stage,
    request?.rating,
    request?.feedbackComments,
    request?.requesterCompany,
  ]); // fetchIntroductionDetails and fetchExistingFeedback intentionally excluded to prevent re-fetching

  const handleFeedbackSubmitted = () => {
    // Invalidate all pipeline and request queries to refresh the parent components
    queryClient.invalidateQueries({ queryKey: ["introduction_requests"] });
    queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    queryClient.invalidateQueries({ queryKey: ["completed_requests"] });

    toast({
      title: "Feedback Submitted",
      description: "Thank you for your feedback!",
    });

    // Close the modal to take the user back to the refreshed list view
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleViewReviews = (connector: {
    id?: string;
    name?: string;
    trustScore?: number;
  }) => {
    setSelectedConnectorForReview(connector);
    setReviewsDialogOpen(true);
  };

  const showWithdraw = !!(isRequester && request?.canRequesterArchive);
  const meetingPastDue =
    !!request?.meetingStartTime &&
    utcDayjs(request.meetingStartTime).isBefore(utcDayjs());
  const meetingUpcoming =
    !request?.meetingStartTime ||
    utcDayjs(request.meetingStartTime).isAfter(utcDayjs());
  const safeMeetingLink = toSafeHttpUrl(request?.meetingLink);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-3xl !ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=open]:!duration-500 data-[state=closed]:!duration-300 will-change-transform"
      >
        {!request ? (
          <RequestDetailsEmpty onClose={onClose} />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto bg-app [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5">
              <RequestDetailsSheetHero />
              <RequestDetailsScrollContent
                request={request}
                isRequester={isRequester}
                handleViewReviews={handleViewReviews}
                detectedIssue={detectedIssue}
                canDispute={canDispute}
                activeDispute={activeDispute}
                onFileDispute={handleFileDispute}
                onViewDispute={handleViewDispute}
                meetingPastDue={meetingPastDue}
                meetingUpcoming={meetingUpcoming}
                safeMeetingLink={safeMeetingLink}
              />
            </div>

            {showWithdraw && (
              <RequestWithdrawFooter
                onWithdrawClick={() => setArchiveModalOpen(true)}
              />
            )}

            <LeaveFeedbackModal
              isOpen={isFeedbackOpen}
              onClose={() => setIsFeedbackOpen(false)}
              introductionRequestId={request.id}
              feedbackToUserId={feedbackToUserId}
              feedbackToUserName={feedbackToUserName}
              feedbackType="meeting"
              existingFeedback={existingFeedback}
              onFeedbackSubmitted={handleFeedbackSubmitted}
            />

            <ArchiveRequesterIntroductionModal
              isOpen={archiveModalOpen}
              onClose={() => setArchiveModalOpen(false)}
              introductionId={request.id}
              prospectName={request.prospectName}
              onSuccess={() => {
                setArchiveModalOpen(false);
                onClose();
              }}
            />
          </>
        )}

        {selectedConnectorForReview && (
          <ReviewsDialog
            open={reviewsDialogOpen}
            onOpenChange={setReviewsDialogOpen}
            connectorName={selectedConnectorForReview.name || "Connector"}
            trustScore={selectedConnectorForReview.trustScore || 0}
            userId={selectedConnectorForReview.id}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
