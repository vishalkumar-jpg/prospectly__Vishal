import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Loader } from "@/components/ui/loader";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  Building2,
  ArrowRight,
  Calendar,
  CheckCircle,
  DollarSign,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Coins,
  Mail,
  Eye,
  AlertCircle,
  Send,
  UserCheck,
  CalendarCheck,
  XCircle,
  RefreshCcw,
  Users,
  Inbox,
  Hourglass,
  Filter,
  CalendarClock,
  Loader2,
  X,
} from "lucide-react";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { StarRating } from "@/components/shared/StarRating";
import { KanbanBoard, KanbanColumn } from "./KanbanLayout";
import { ConnectorPipelineCard } from "./ConnectorPipelineCard";
import { MeetingSchedulingActions } from "./MeetingSchedulingActions";
import { IntroductionDetailsModal } from "./IntroductionDetailsModal";
import { EmailTrackingModal } from "./EmailTrackingModal";
import { PayoutDetailsModal } from "./PayoutDetailsModal";
import { LeaveFeedbackModal } from "./LeaveFeedbackModal";
import { ReviewsDialog } from "./ReviewsDialog";
import { MarkUnfulfilledModal } from "./MarkUnfulfilledModal";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useBountyPercentages } from "@/hooks/useBountyPercentages";
import { useBountyStages } from "@/hooks/useBountyStages";
import { usePipelineFilterConfig } from "@/hooks/usePipelineFilterConfig";
import { useUnsuccessfulEnabledTimePeriod } from "@/hooks/useUnsuccessfulEnabledTimePeriod";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  formatMeetingDate,
  formatLastActivity,
  formatMeetingDateWithTimezone,
} from "@/utils/dateFormatting";
import { toUTC, utcDayjs } from "@/lib/dayjs";
import { AnyType } from "@/types/common";
import {
  useIntroductionDeepLink,
  useIntroductionDeepLinkLocal,
} from "@/hooks/introduction/use-introduction-deep-link";
import { Badge } from "../ui/badge";

interface ActiveIntroduction {
  id: string;
  requesterName: string;
  requesterCompany: string;
  requesterPhotoUrl?: string | null;
  requesterId?: string; // For Reviews button
  targetName: string;
  targetCompany: string;
  targetPhotoUrl?: string | null;
  bountyAmount: number;
  stage:
    | "request_accepted"
    | "intro_sent"
    | "response_received"
    | "meeting_booked"
    | "meeting_rescheduled"
    | "meeting_completed"
    | "peer_feedback";
  lastActivity: string;
  lastActivityTimestamp?: string; // Raw timestamp for conditional formatting
  createdAt?: string | null;
  nextAction: string;
  progress: number;
  meetingDate?: string;
  meetingStartTime?: string; // Full ISO datetime from scheduled_meetings table
  meetingTimezone?: string; // Timezone from scheduled_meetings table
  requesterMeetingUrl?: string;
  rating?: number;
  feedbackComments?: string;
  meetingTitle?: string | null;
  meetingDescription?: string | null;
  additionalContext?: string | null;
  isRequester?: boolean; // From API - indicates if current user is the requester
  payoutReleased?: boolean; // True if payout_released column is true in database
  payoutTriggeredBy?: "trust_score" | "peer_feedback" | null; // What triggered the payout
  // Transaction data for 5%/95% payment split display
  initialChargeAmount?: number | null; // 5% amount
  initialChargeCaptured?: boolean; // Whether 5% was captured (intro sent)
  initialChargeCapturedAt?: string | null;
  remainingChargeAmount?: number | null; // 95% amount
  remainingChargeCaptured?: boolean; // Whether 95% was captured (meeting booked)
  remainingChargeCapturedAt?: string | null;
  platformCommissionAmount?: number | null; // 20% platform fee
  connectorPayoutAmount?: number | null; // 80% connector earnings
  // Prospect details
  targetTitle?: string | null;
  targetIndustry?: string | null;
  targetLinkedinUrl?: string | null;
  targetLocation?: string | null;
  targetEmployees?: string | null;
  targetCompanyIndustry?: string | null;
  targetCompanyDescription?: string | null;
  targetLinkedinConnections?: string | null;
  // Requester details
  requesterTitle?: string | null;
  requesterIndustry?: string | null;
  requesterLinkedinUrl?: string | null;
  requesterLocation?: string | null;
  requesterWebsiteUrl?: string | null;
  requesterTrustScore?: number;
  requesterBio?: string | null;
  requesterOrganizations?: Array<{
    id: string;
    name: string;
    isVerified: boolean;
  }>;
  targetOrganizations?: Array<{
    id: string;
    name: string;
    isVerified: boolean;
  }>;
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

interface PipelineTabProps {
  viewMode?: "columns" | "rows";
  onSwitchToArchive?: () => void;
  search?: string;
  emailLinkParams?:
    | import("@/types/introduction-deep-link").IntroductionEmailLinkParams
    | null;
  onEmailLinkHandled?: () => void;
}

function getIntroductionProgressForStage({
  newStage,
}: {
  newStage: string;
}): number {
  if (newStage === "peer_feedback") return 100;
  if (newStage === "meeting_completed") return 90;
  if (newStage === "meeting_booked" || newStage === "meeting_rescheduled") {
    return 75;
  }
  if (newStage === "response_received") return 65;
  if (newStage === "intro_sent") return 50;
  return 25;
}

function patchIntroductionStageInList({
  introductions,
  introId,
  newStage,
  meetingDetails,
}: {
  introductions: ActiveIntroduction[];
  introId: string;
  newStage: string;
  meetingDetails?: AnyType;
}): ActiveIntroduction[] {
  return introductions.map((intro) => {
    if (intro.id !== introId) return intro;
    return {
      ...intro,
      stage: newStage as ActiveIntroduction["stage"],
      meetingDate: meetingDetails?.date || intro.meetingDate,
      progress: getIntroductionProgressForStage({ newStage }),
    };
  });
}

function openConnectorFeedbackModal({
  introId,
  setFeedbackModalOpen,
}: {
  introId: string;
  setFeedbackModalOpen: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
}): void {
  setFeedbackModalOpen((prev) => ({ ...prev, [introId]: true }));
}

type PipelineRowStage = {
  id: string;
  title: string;
  name: string;
  description: string;
  dotColor: string;
  introductions: ActiveIntroduction[];
};

const DEFAULT_ROW_STAGE_HEADER_GRADIENT =
  "from-slate-500/10 to-slate-600/20 text-slate-800 dark:text-slate-200 border border-slate-200/50";

const ROW_STAGE_HEADER_GRADIENT_RULES: Array<{
  match: (dotColor: string) => boolean;
  className: string;
}> = [
  {
    match: (d) => d.includes("blue"),
    className:
      "from-blue-500/10 to-blue-600/20 text-blue-800 dark:text-blue-200 border border-blue-200/50",
  },
  {
    match: (d) => d.includes("sky"),
    className:
      "from-sky-500/10 to-sky-600/20 text-sky-800 dark:text-sky-200 border border-sky-200/50",
  },
  {
    match: (d) => d.includes("cyan"),
    className:
      "from-cyan-500/10 to-cyan-600/20 text-cyan-800 dark:text-cyan-200 border border-cyan-200/50",
  },
  {
    match: (d) => d.includes("orange"),
    className:
      "from-orange-500/10 to-orange-600/20 text-orange-800 dark:text-orange-200 border border-orange-200/50",
  },
  {
    match: (d) => d.includes("yellow") || d.includes("amber"),
    className:
      "from-amber-500/10 to-amber-600/20 text-amber-800 dark:text-amber-200 border border-amber-200/50",
  },
  {
    match: (d) =>
      d.includes("purple") || d.includes("violet") || d.includes("fuchsia"),
    className:
      "from-purple-500/10 to-purple-600/20 text-purple-800 dark:text-purple-200 border border-purple-200/50",
  },
  {
    match: (d) => d.includes("green"),
    className:
      "from-green-500/10 to-green-600/20 text-green-800 dark:text-green-200 border border-green-200/50",
  },
  {
    match: (d) => d.includes("emerald") || d.includes("teal"),
    className:
      "from-teal-500/10 to-teal-600/20 text-teal-800 dark:text-teal-200 border border-teal-200/50",
  },
  {
    match: (d) => d.includes("indigo"),
    className:
      "from-indigo-500/10 to-indigo-600/20 text-indigo-800 dark:text-indigo-200 border border-indigo-200/50",
  },
  {
    match: (d) => d.includes("red"),
    className:
      "from-red-500/10 to-red-600/20 text-red-800 dark:text-red-200 border border-red-200/50",
  },
  {
    match: (d) => d.includes("pink"),
    className:
      "from-pink-500/10 to-pink-600/20 text-pink-800 dark:text-pink-200 border border-pink-200/50",
  },
];

function getRowStageHeaderGradientClass(dotColor: string): string {
  const rule = ROW_STAGE_HEADER_GRADIENT_RULES.find((r) => r.match(dotColor));
  return rule?.className ?? DEFAULT_ROW_STAGE_HEADER_GRADIENT;
}

type NextActionIconConfig = {
  icon: typeof Send;
  bgColor: string;
  iconColor: string;
  label: string;
};

type PipelineRowIntroCardProps = {
  intro: ActiveIntroduction;
  selectedIntro: string | null;
  emailStatus: Record<string, AnyType>;
  onCardClick: (intro: ActiveIntroduction) => void;
  onViewPayout: (intro: ActiveIntroduction, e: React.MouseEvent) => void;
  onEmailInsights: (introId: string, e: React.MouseEvent) => void;
  onUpdateStage: (
    introId: string,
    newStage: string,
    meetingDetails?: AnyType
  ) => void;
  getProgressColor: (progress: number) => string;
  getNextActionIcon: (stage: string) => NextActionIconConfig;
  getActualEarnedAmount: (intro: ActiveIntroduction) => {
    earned: number;
    potential: number;
    percentage: string;
  };
};

const ROW_EMAIL_STATUS_STYLES: Record<
  string,
  { className: string; label: string; useAlertIcon?: boolean }
> = {
  sent: {
    className:
      "bg-blue-50 text-blue-700 hover:bg-blue-700 hover:text-blue-50 border border-blue-200",
    label: "Email sent",
  },
  delivered: {
    className:
      "bg-green-50 text-green-700 hover:bg-green-700 hover:text-green-50 border border-green-200",
    label: "Email delivered",
  },
  delivery_delayed: {
    className:
      "bg-yellow-50 text-yellow-700 hover:bg-yellow-700 hover:text-yellow-50 border border-yellow-200",
    label: "Delivery delayed",
    useAlertIcon: true,
  },
  bounced: {
    className:
      "bg-red-50 text-red-700 hover:bg-red-700 hover:text-red-50 border border-red-200",
    label: "Email bounced",
  },
  failed: {
    className:
      "bg-red-50 text-red-700 hover:bg-red-700 hover:text-red-50 border border-red-200",
    label: "Email failed",
  },
};

function PipelineRowEmailStatusBanner({ status }: { status: string }) {
  const config = ROW_EMAIL_STATUS_STYLES[status];
  if (!config) return null;
  const Icon = config.useAlertIcon ? AlertCircle : Mail;
  return (
    <div
      className={`flex items-center gap-2 text-xs p-2.5 rounded-lg w-full font-semibold ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{config.label}</span>
    </div>
  );
}

function PipelineRowIntroMeetingHeader({
  intro,
  onViewMore,
}: {
  intro: ActiveIntroduction;
  onViewMore: (e: React.MouseEvent) => void;
}) {
  if (!intro.meetingTitle && !intro.meetingDescription) return null;
  return (
    <div className="mb-2 px-2">
      {intro.meetingTitle && (
        <div className="text-base font-bold text-foreground mb-2 leading-tight">
          {intro.meetingTitle}
        </div>
      )}
      {intro.meetingDescription && (
        <div className="relative">
          <div className="text-xs text-foreground line-clamp-2 overflow-hidden leading-relaxed">
            {intro.meetingDescription}
          </div>
          <div className="flex justify-end mt-1">
            <Button
              variant="link"
              onClick={onViewMore}
              className="text-xs font-medium underline bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent hover:opacity-80 h-auto p-0"
            >
              View more
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineRowIntroPartiesRow({ intro }: { intro: ActiveIntroduction }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarFallback>
            {intro.requesterName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">
            {intro.requesterName}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{intro.requesterCompany}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{intro.targetName}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{intro.targetCompany}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm truncate">
          {intro.meetingStartTime
            ? formatMeetingDateWithTimezone(intro.meetingStartTime)
            : intro.meetingDate
              ? formatMeetingDate(intro.meetingDate)
              : "Not scheduled"}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <DollarSign className="h-4 w-4 text-primary" />
        <span className="font-semibold text-primary">
          {intro.bountyAmount.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
        <Clock className="h-3 w-3" />
        <span>
          {formatLastActivity(intro.lastActivityTimestamp, intro.lastActivity)}
        </span>
      </div>
    </div>
  );
}

function PipelineRowIntroProgressBar({
  intro,
  getProgressColor,
}: {
  intro: ActiveIntroduction;
  getProgressColor: (progress: number) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-muted-foreground">Progress</span>
        <span className="font-bold text-primary">{intro.progress}%</span>
      </div>
      <Progress
        value={intro.progress}
        className={`h-2 shadow-sm ${getProgressColor(intro.progress)}`}
      />
    </div>
  );
}

function PipelineRowNextActionBadge({
  intro,
  getNextActionIcon,
}: {
  intro: ActiveIntroduction;
  getNextActionIcon: (stage: string) => NextActionIconConfig;
}) {
  const actionIcon = getNextActionIcon(intro.stage);
  const IconComponent = actionIcon.icon;
  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${actionIcon.bgColor} border border-${actionIcon.iconColor.replace("text-", "")}/20 cursor-help hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200`}
        >
          <IconComponent className={`h-4 w-4 ${actionIcon.iconColor}`} />
          <span className={`text-xs font-bold ${actionIcon.iconColor}`}>
            {actionIcon.label}
          </span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="center"
        className="w-auto max-w-xs p-3 animate-in fade-in-0 zoom-in-95 duration-200"
      >
        <p className="text-xs font-semibold">{intro.nextAction}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

function PipelineRowEarningsBreakdown({
  intro,
  getActualEarnedAmount,
}: {
  intro: ActiveIntroduction;
  getActualEarnedAmount: PipelineRowIntroCardProps["getActualEarnedAmount"];
}) {
  const earnings = getActualEarnedAmount(intro);
  return (
    <div className="pt-3 mt-3 border-t border-border">
      <div className="bg-gradient-to-br from-primary/8 to-primary/12 p-3.5 rounded-lg border border-primary/25 shadow-sm">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Full Referral Payout</span>
            <span className="font-medium">
              ${intro.bountyAmount.toLocaleString()}
            </span>
          </div>
          <div className="hidden flex justify-between">
            <span className="text-muted-foreground">Escrow Fee (20%)</span>
            <span className="font-bold text-muted-foreground">
              $
              {intro.platformCommissionAmount?.toLocaleString() ??
                Math.round(intro.bountyAmount * 0.2).toLocaleString()}
            </span>
          </div>
          {earnings.earned > 0 && (
            <div className="flex justify-between font-semibold border-t pt-2 mt-1">
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Earned So Far ({earnings.percentage})
              </span>
              <span className="text-emerald-600 font-bold">
                ${earnings.earned.toLocaleString()}
              </span>
            </div>
          )}
          {earnings.earned < earnings.potential && (
            <div className="flex justify-between">
              <span className="text-amber-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Potential Earnings (80%)
              </span>
              <span className="text-amber-600 font-bold">
                ${earnings.potential.toLocaleString()}
              </span>
            </div>
          )}
          {earnings.earned === earnings.potential && earnings.earned > 0 && (
            <div className="flex justify-between font-bold border-t-2 pt-2 mt-1 border-emerald-500/30">
              <span className="text-emerald-600 flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" />
                Your Total Earnings
              </span>
              <span className="text-emerald-600 font-black text-sm">
                ${earnings.earned.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PipelineRowIntroActions({
  intro,
  onViewPayout,
  onEmailInsights,
  onUpdateStage,
}: Pick<
  PipelineRowIntroCardProps,
  "intro" | "onViewPayout" | "onEmailInsights" | "onUpdateStage"
>) {
  return (
    <div
      className="flex flex-col gap-2 pt-2 border-t"
      onClick={(e) => e.stopPropagation()}
    >
      {intro.stage === "intro_sent" && (
        <Button
          variant="default"
          size="sm"
          onClick={(e) => onEmailInsights(intro.id, e)}
          className="w-full flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Email Insights</span>
        </Button>
      )}
      <Button
        variant="default"
        size="sm"
        onClick={(e) => onViewPayout(intro, e)}
        className="w-full flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
      >
        <Coins className="h-3.5 w-3.5" />
        <span>View Payout</span>
      </Button>
      <MeetingSchedulingActions
        stage={intro.stage}
        requesterName={intro.requesterName}
        targetName={intro.targetName}
        meetingDate={intro.meetingDate}
        introductionRequestId={intro.id}
        isRequester={intro.isRequester ?? false}
        onUpdateStage={(newStage, meetingDetails) =>
          onUpdateStage(intro.id, newStage, meetingDetails)
        }
      />
    </div>
  );
}

function PipelineRowIntroCard(props: PipelineRowIntroCardProps) {
  const {
    intro,
    selectedIntro,
    emailStatus,
    onCardClick,
    onViewPayout,
    onEmailInsights,
    onUpdateStage,
    getProgressColor,
    getNextActionIcon,
    getActualEarnedAmount,
  } = props;
  const introEmailStatus = emailStatus[intro.id]?.status as string | undefined;

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-lg cursor-pointer ${
        selectedIntro === intro.id ? "ring-2 ring-primary shadow-lg" : ""
      }`}
      onClick={() => onCardClick(intro)}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <PipelineRowIntroMeetingHeader
            intro={intro}
            onViewMore={(e) => {
              e.stopPropagation();
              onCardClick(intro);
            }}
          />
          <PipelineRowIntroPartiesRow intro={intro} />
          {intro.stage === "intro_sent" && introEmailStatus && (
            <div className="flex items-center">
              <PipelineRowEmailStatusBanner status={introEmailStatus} />
            </div>
          )}
          <PipelineRowIntroProgressBar
            intro={intro}
            getProgressColor={getProgressColor}
          />
          <div className="border-t pt-3">
            <div className="flex items-center justify-center mb-3">
              <PipelineRowNextActionBadge
                intro={intro}
                getNextActionIcon={getNextActionIcon}
              />
            </div>
            <PipelineRowEarningsBreakdown
              intro={intro}
              getActualEarnedAmount={getActualEarnedAmount}
            />
          </div>
          <PipelineRowIntroActions
            intro={intro}
            onViewPayout={onViewPayout}
            onEmailInsights={onEmailInsights}
            onUpdateStage={onUpdateStage}
          />
        </div>
      </CardContent>
    </Card>
  );
}

type PipelineRowStageSectionProps = {
  stage: PipelineRowStage;
  isCollapsed: boolean;
  onToggle: () => void;
} & Omit<PipelineRowIntroCardProps, "intro"> & {
    onEmailInsights: (introId: string, e: React.MouseEvent) => void;
  };

function PipelineRowStageHeader({
  stage,
  count,
  isCollapsed,
}: {
  stage: PipelineRowStage;
  count: number;
  isCollapsed: boolean;
}) {
  const gradientClass = getRowStageHeaderGradientClass(stage.dotColor);
  return (
    <CollapsibleTrigger asChild>
      <div
        className={`p-4 rounded-lg bg-gradient-to-r cursor-pointer hover:opacity-80 transition-opacity ${gradientClass} shadow-sm`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
            <div>
              <h3 className="text-lg font-semibold">
                <span className="text-sm font-medium text-muted-foreground">
                  {stage.title}
                </span>
                <br />
                <span>{stage.name}</span>
              </h3>
              <p className="text-sm opacity-75">{stage.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{count}</div>
          </div>
        </div>
      </div>
    </CollapsibleTrigger>
  );
}

function PipelineRowStageSection({
  stage,
  isCollapsed,
  onToggle,
  ...cardProps
}: PipelineRowStageSectionProps) {
  const count = stage.introductions.length;
  return (
    <Collapsible open={!isCollapsed} onOpenChange={onToggle}>
      <div className="space-y-3">
        <PipelineRowStageHeader
          stage={stage}
          count={count}
          isCollapsed={isCollapsed}
        />
        <CollapsibleContent>
          <div className="space-y-3 mt-3">
            {stage.introductions.map((intro) => (
              <PipelineRowIntroCard
                key={intro.id}
                intro={intro}
                {...cardProps}
              />
            ))}
            {count === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No introductions in this stage
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function PipelineTab({
  viewMode = "columns",
  onSwitchToArchive,
  search = "",
  emailLinkParams = null,
  onEmailLinkHandled,
}: PipelineTabProps) {
  const [selectedIntro] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedIntroForDetails, setSelectedIntroForDetails] =
    useState<ActiveIntroduction | null>(null);
  const [emailTrackingModalOpen, setEmailTrackingModalOpen] = useState(false);
  const [selectedIntroForEmail, setSelectedIntroForEmail] = useState<
    string | null
  >(null);
  const [emailStatus, setEmailStatus] = useState<Record<string, AnyType>>({});
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [selectedIntroForTransactions, setSelectedIntroForTransactions] =
    useState<ActiveIntroduction | null>(null);
  const [introductions, setIntroductions] = useState<ActiveIntroduction[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<{
    [key: string]: boolean;
  }>({});
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [acknowledgeDialogOpen, setAcknowledgeDialogOpen] = useState<
    Record<string, boolean>
  >({});
  const [feedbackModalOpen, setFeedbackModalOpen] = useState<
    Record<string, boolean>
  >({});
  const [reviewsDialogOpen, setReviewsDialogOpen] = useState(false);
  const [selectedRequesterForReview] = useState<{
    id?: string;
    name?: string;
    trustScore?: number;
  } | null>(null);
  const [unfulfilledModalOpen, setUnfulfilledModalOpen] = useState(false);
  const [selectedIntroForUnfulfilled, setSelectedIntroForUnfulfilled] =
    useState<ActiveIntroduction | null>(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [reschedulingIntro, setReschedulingIntro] =
    useState<ActiveIntroduction | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const { toast } = useToast();
  const unsuccessfulTimePeriodDays = useUnsuccessfulEnabledTimePeriod();
  const [, setMinuteTick] = useState(0);

  useEffect(() => {
    if (unsuccessfulTimePeriodDays <= 0) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setMinuteTick((tick) => tick + 1);
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [unsuccessfulTimePeriodDays]);
  const { loading: percentagesLoading } = useBountyPercentages();
  const { stages: dbStages, loading: stagesLoading } = useBountyStages();
  const {
    connectorPipelineFilterStages,
    savePipelineFilter,
    isLoading: configLoading,
  } = usePipelineFilterConfig();
  const { currentUser } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const hasInitializedFilter = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!configLoading && !hasInitializedFilter.current) {
      setSelectedStages(connectorPipelineFilterStages);
      hasInitializedFilter.current = true;
    }
  }, [configLoading, connectorPipelineFilterStages]);

  const calculateProgress = useCallback(
    (stageId: string | null): number => {
      if (!stageId) return 0;

      const effectiveStageId =
        stageId === "meeting_rescheduled" ? "meeting_booked" : stageId;

      // Find the stage in dbStages to get its order
      const stage = dbStages.find((s) => s.stageId === effectiveStageId);
      if (!stage) return 0;

      // Calculate progress based on stageOrder
      // Each stage represents 25% (4 stages total)
      return stage.stageOrder * 25;
    },
    [dbStages]
  );

  const getProgressColor = (progress: number): string => {
    if (progress === 0) return "[&>div]:bg-gray-400";
    if (progress === 25) return "[&>div]:bg-yellow-500";
    if (progress === 50) return "[&>div]:bg-blue-500";
    if (progress === 75) return "[&>div]:bg-orange-500";
    if (progress === 100) return "[&>div]:bg-green-500";
    return "[&>div]:bg-primary";
  };

  const getNextAction = (stage: string, payoutReleased?: boolean): string => {
    // If payout is already released, show "Complete feedback" for peer_feedback stage
    if (stage === "peer_feedback" && payoutReleased) {
      return "Complete feedback";
    }
    const actionMap: Record<string, string> = {
      request_accepted: "Send introduction email",
      intro_sent: "Await prospect's reply; follow up if no response.",
      meeting_booked:
        "Monitor that the meeting is confirmed and takes place successfully.",
      meeting_rescheduled: "Waiting for prospect to book a new time slot.",
      meeting_completed:
        "No action required — awaiting requester confirmation.",
      peer_feedback: "Complete your feedback to receive payment.",
    };
    return actionMap[stage] || "In progress";
  };

  const getNextActionIcon = (stage: string) => {
    const iconMap: Record<
      string,
      { icon: typeof Send; bgColor: string; iconColor: string; label: string }
    > = {
      request_accepted: {
        icon: Send,
        bgColor: "bg-blue-50",
        iconColor: "text-blue-600",
        label: "Send Email",
      },
      intro_sent: {
        icon: UserCheck,
        bgColor: "bg-purple-50",
        iconColor: "text-purple-600",
        label: "Await Reply",
      },
      meeting_booked: {
        icon: CalendarCheck,
        bgColor: "bg-green-50",
        iconColor: "text-green-600",
        label: "Monitor Meeting",
      },
      meeting_rescheduled: {
        icon: RefreshCcw,
        bgColor: "bg-amber-50",
        iconColor: "text-amber-600",
        label: "Wait for Rebook",
      },
      meeting_completed: {
        icon: Hourglass,
        bgColor: "bg-orange-50",
        iconColor: "text-orange-600",
        label: "Awaiting Confirmation",
      },
      peer_feedback: {
        icon: MessageSquare,
        bgColor: "bg-emerald-50",
        iconColor: "text-emerald-600",
        label: "Submit Feedback",
      },
    };
    return (
      iconMap[stage] || {
        icon: CheckCircle,
        bgColor: "bg-gray-50",
        iconColor: "text-gray-600",
        label: "In Progress",
      }
    );
  };

  const searchParam = search.trim() || undefined;

  // Fetch real data from API using React Query
  const { data: pipelineData, isLoading: queryLoading } = useQuery<AnyType[]>({
    queryKey: [
      "/api/introduction-requests/connector/pipeline",
      { search: searchParam },
    ],
    enabled: !!currentUser?.id,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Transform API data to component format
  useEffect(() => {
    if (!pipelineData) {
      setIntroductions([]);
      setLoading(queryLoading);
      return;
    }

    try {
      const transformed: ActiveIntroduction[] = pipelineData.map(
        (req: AnyType) => ({
          id: req.id,
          requesterName:
            (req.requesterName === "Unknown" || !req.requesterName) &&
            !req.requesterId
              ? "User's Account deleted"
              : req.requesterName || "Unknown Requester",
          requesterCompany: req.requesterCompany || "Unknown Company",
          requesterPhotoUrl: req.requesterPhotoUrl || null,
          requesterId: req.requesterId || null,
          targetName: req.targetName || "Unknown",
          targetCompany: req.targetCompany || "Unknown Company",
          targetPhotoUrl: req.targetPhotoUrl || null,
          bountyAmount: Number(req.bountyAmount || 0),
          stage: req.stage,
          lastActivity: formatDistanceToNow(toUTC(req.lastActivity), {
            addSuffix: true,
          }),
          lastActivityTimestamp: req.lastActivity,
          createdAt: req.createdAt ?? null,
          nextAction: getNextAction(req.stage, req.payoutReleased),
          progress: calculateProgress(req.stage),
          meetingDate: req.meetingDate || null,
          meetingStartTime: req.meetingStartTime || null,
          meetingTimezone: req.meetingTimezone || null,
          requesterMeetingUrl: req.requesterMeetingUrl,
          meetingTitle: req.meetingTitle || null,
          meetingDescription: req.meetingDescription || null,
          additionalContext: req.additionalContext || null,
          payoutReleased: req.payoutReleased ?? false,
          payoutTriggeredBy: req.payoutTriggeredBy ?? null,
          // Prospect details
          targetTitle: req.targetTitle,
          targetIndustry: req.targetIndustry,
          targetLinkedinUrl: req.targetLinkedinUrl,
          targetLocation: req.targetLocation,
          targetEmployees: req.targetEmployees,
          targetCompanyIndustry: req.targetCompanyIndustry,
          targetCompanyDescription: req.targetCompanyDescription,
          targetLinkedinConnections: req.targetLinkedinConnections,
          // Requester details
          requesterTitle: req.requesterTitle,
          requesterIndustry: req.requesterIndustry,
          requesterLinkedinUrl: req.requesterLinkedinUrl,
          requesterLocation: req.requesterLocation,
          requesterWebsiteUrl: req.requesterWebsiteUrl,
          requesterTrustScore: req.requesterTrustScore || 0,
          requesterBio: req.requesterBio,
          requesterOrganizations: req.requesterOrganizations ?? [],
          requesterEmail: req.requesterEmail || null,
          targetOrganizations: req.targetOrganizations ?? [],
          // Prospect contact fields
          targetEmail: req.targetEmail || null,
          targetWebsiteUrl: req.targetWebsiteUrl || null,
          targetCompanyLinkedinUrl: req.targetCompanyLinkedinUrl || null,
          targetBio: req.targetBio || null,
          // Transaction data for 5%/95% payment split display
          initialChargeAmount: req.initialChargeAmount ?? null,
          initialChargeCaptured: req.initialChargeCaptured ?? false,
          initialChargeCapturedAt: req.initialChargeCapturedAt ?? null,
          remainingChargeAmount: req.remainingChargeAmount ?? null,
          remainingChargeCaptured: req.remainingChargeCaptured ?? false,
          remainingChargeCapturedAt: req.remainingChargeCapturedAt ?? null,
          platformCommissionAmount: req.platformCommissionAmount ?? null,
          connectorPayoutAmount: req.connectorPayoutAmount ?? null,
        })
      );

      setIntroductions(transformed);
      setLoading(false);
    } catch {
      // Error transforming pipeline data - handled by setting empty array
      setIntroductions([]);
      setLoading(false);
    }
  }, [pipelineData, queryLoading, calculateProgress]);

  const isLocalPipelineLink =
    Boolean(emailLinkParams) &&
    emailLinkParams?.action !== "review" &&
    emailLinkParams?.action !== "feedback";

  useIntroductionDeepLink({
    emailLinkParams,
    isLoading: loading,
    action: "feedback",
    enabled: emailLinkParams?.action === "feedback",
    items: introductions,
    findItem: (id) => introductions.find((item) => item.id === id),
    onReady: (intro) => {
      setFeedbackModalOpen((prev) => ({ ...prev, [intro.id]: true }));
    },
    onHandled: onEmailLinkHandled,
    notFoundContext: "pipeline",
  });

  useIntroductionDeepLinkLocal({
    emailLinkParams,
    isLoading: loading,
    enabled: isLocalPipelineLink,
    items: introductions,
    findItem: (id) => introductions.find((item) => item.id === id),
    onReady: (intro) => {
      setSelectedIntroForDetails(intro);
      setDetailsModalOpen(true);
    },
    onHandled: onEmailLinkHandled,
    notFoundContext: "pipeline",
  });

  // TODO: Migrate email status fetching to Express API
  // For now, email status will be empty
  useEffect(() => {
    setEmailStatus({});
  }, [introductions]);

  // Payout info for connector (when money is paid to them)
  const getConnectorPayoutInfo = (
    stageId: string
  ): { percentage: string; label: string } => {
    switch (stageId) {
      case "intro_sent":
        return { percentage: "5%", label: "Requester Charged" };
      case "meeting_booked":
      case "meeting_rescheduled":
        return { percentage: "95%", label: "Requester Charged" };
      case "meeting_completed":
        return { percentage: "80%", label: "" };
      case "peer_feedback":
        return { percentage: "80%", label: "" };
      default:
        return { percentage: "-", label: "Pending" };
    }
  };

  // Convert database stages to pipeline format, explicitly keeping only specified stages
  const stages = dbStages
    .filter(
      (s) =>
        s.stageId === "intro_sent" ||
        s.stageId === "meeting_booked" ||
        s.stageId === "meeting_completed" ||
        s.stageId === "peer_feedback"
    )
    .sort((a, b) => a.stageOrder - b.stageOrder)
    .map((stage) => {
      const payoutInfo = getConnectorPayoutInfo(stage.stageId);
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
        title: stage.title,
        name: stage.title, // Use the configured title as the name
        description: stage.description,
        payoutPercentage: payoutInfo.percentage,
        payoutLabel: payoutInfo.label,
        ...colors,
      };
    });

  // Calculate actual earned amount based on what's been captured
  // If only intro_sent (5% captured): connector gets 5% of total bounty (not 80% of 5%)
  // If meeting_booked (both captured): connector gets 80% of total bounty
  const getActualEarnedAmount = (
    intro: ActiveIntroduction
  ): { earned: number; potential: number; percentage: string } => {
    const totalBounty = intro.bountyAmount;
    const potentialEarnings = Math.round(totalBounty * 0.8); // 80% of total bounty

    if (intro.remainingChargeCaptured) {
      // Both payments captured - full 80% earned
      return {
        earned: intro.connectorPayoutAmount ?? potentialEarnings,
        potential: potentialEarnings,
        percentage: "80%",
      };
    } else if (intro.initialChargeCaptured) {
      // Only intro sent (5% captured) - connector gets 5% of total bounty
      const earnedAmount = Math.round(totalBounty * 0.05);
      return {
        earned: earnedAmount,
        potential: potentialEarnings,
        percentage: "5%",
      };
    } else {
      // Nothing captured yet
      return {
        earned: 0,
        potential: potentialEarnings,
        percentage: "0%",
      };
    }
  };

  const getStageInfo = (stage: string) => {
    const effectiveStageId =
      stage === "meeting_rescheduled" ? "meeting_booked" : stage;
    const info = stages.find((s) => s.id === effectiveStageId) || stages[0];

    if (stage === "meeting_rescheduled") {
      return {
        ...info,
        id: "meeting_rescheduled",
        title: "Rescheduled",
        name: "Rescheduled",
        dotColor: "bg-orange-500",
        bgColor: "bg-orange-50",
        textColor: "text-orange-700",
      };
    }

    return info;
  };

  // Helper function to derive existingFeedback from pipeline data
  const getExistingFeedbackFromIntro = useCallback(
    (intro: ActiveIntroduction) => {
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

  // Show loading state while stages are loading
  if (stagesLoading || percentagesLoading || loading) {
    return <Loader message="Loading pipeline..." />;
  }

  const handleUpdateIntroStage = (
    introId: string,
    newStage: string,
    meetingDetails?: AnyType
  ) => {
    setIntroductions((prev) =>
      patchIntroductionStageInList({
        introductions: prev,
        introId,
        newStage,
        meetingDetails,
      })
    );
  };

  const groupedIntroductions = stages
    .filter((stage) => stage.id !== "platform_fee") // Exclude platform fee (stage 6), keep stages 1-5 including peer_feedback
    .map((stage) => ({
      ...stage,
      introductions: introductions.filter((intro) => {
        if (stage.id === "meeting_booked") {
          return (
            intro.stage === "meeting_booked" ||
            intro.stage === "meeting_rescheduled"
          );
        }
        return intro.stage === stage.id;
      }),
    }));

  const toggleSection = (stageId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  };

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

  const handleCardClick = (intro: ActiveIntroduction) => {
    setSelectedIntroForDetails(intro);
    setDetailsModalOpen(true);
  };

  const handleViewPayout = (intro: ActiveIntroduction, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIntroForTransactions(intro);
    setTransactionModalOpen(true);
  };

  const handleFeedbackSubmitted = (introId: string) => {
    toast({
      title: "Feedback Submitted",
      description: "Thank you for your feedback!",
    });

    // Refresh pipeline data
    queryClient.invalidateQueries({
      queryKey: ["/api/introduction-requests/connector/pipeline"],
    });

    // Feedback data will be refreshed when pipeline data refetches

    // Close modal
    setFeedbackModalOpen((prev) => ({
      ...prev,
      [introId]: false,
    }));

    // Switch to Archive tab after successful feedback submission
    if (onSwitchToArchive) {
      onSwitchToArchive();
    }
  };

  const handleRescheduleMeeting = async (intro: ActiveIntroduction) => {
    setIsRescheduling(true);
    try {
      const { api } = await import("@/lib/api");
      const response = await api.introductions.rescheduleMeeting(intro.id);

      setRescheduleDialogOpen(false);
      setReschedulingIntro(null);

      // Show success message
      toast({
        title: "Meeting Rescheduled",
        description:
          response.message ||
          "A new booking link has been sent to the prospect.",
      });

      // Refresh pipeline data
      queryClient.invalidateQueries({
        queryKey: ["/api/introduction-requests/connector/pipeline"],
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to reschedule meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRescheduling(false);
    }
  };

  const filteredGroupedIntroductions = groupedIntroductions.filter(
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
            savePipelineFilter("connector", []);
          }}
        >
          All Stages
        </DropdownMenuCheckboxItem>
        {groupedIntroductions.map((stage) => (
          <DropdownMenuCheckboxItem
            key={stage.id}
            checked={selectedStages.includes(stage.id)}
            onCheckedChange={(checked) => {
              const next = checked
                ? [...selectedStages, stage.id]
                : selectedStages.filter((id) => id !== stage.id);
              setSelectedStages(next);
              savePipelineFilter("connector", next);
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

  const filterContainer = document.getElementById("pipeline-filter-container");

  const renderColumnStage = (
    stage: (typeof filteredGroupedIntroductions)[number]
  ) => {
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
          stage.payoutPercentage &&
          stage.id !== "meeting_completed" &&
          stage.id !== "peer_feedback" &&
          stage.payoutPercentage !== "-"
            ? stage.payoutPercentage
            : undefined
        }
        paymentLabel={
          stage.payoutLabel !== "Pending" ? stage.payoutLabel : undefined
        }
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
          <ConnectorPipelineCard
            key={intro.id}
            intro={intro as AnyType}
            isExpanded={expandedCards.has(intro.id)}
            isSelected={selectedIntro === intro.id}
            onToggleExpansion={(e) => toggleCardExpansion(intro.id, e)}
            onCardClick={() => handleCardClick(intro)}
            onViewTransactions={(e) => handleViewPayout(intro, e)}
            onLeaveFeedback={(e) => {
              e.stopPropagation();
              openConnectorFeedbackModal({
                introId: intro.id,
                setFeedbackModalOpen,
              });
            }}
            onMarkUnsuccessful={(e) => {
              e.stopPropagation();
              setSelectedIntroForUnfulfilled(intro);
              setUnfulfilledModalOpen(true);
            }}
            onRescheduleMeeting={(e) => {
              e.stopPropagation();
              setReschedulingIntro(intro);
              setRescheduleDialogOpen(true);
            }}
            onEmailInsights={(e) => {
              e.stopPropagation();
              setSelectedIntroForEmail(intro.id);
              setEmailTrackingModalOpen(true);
            }}
            onUpdateStage={() => {
              queryClient.invalidateQueries({
                queryKey: ["/api/introduction-requests/connector/pipeline"],
              });
            }}
            getProgressColor={getProgressColor}
            unsuccessfulTimePeriodDays={unsuccessfulTimePeriodDays}
          />
        ))}
      </KanbanColumn>
    );
  };

  return (
    <div
      className={
        viewMode === "columns"
          ? "flex flex-col h-full overflow-hidden pb-4 max-h-[93vh]"
          : "space-y-6 h-full overflow-y-auto thin-scroll pb-4 min-h-0 max-h-[93vh]"
      }
    >
      {filterContainer ? (
        createPortal(filterDropdown, filterContainer)
      ) : (
        <div className="flex justify-end px-6 mt-2">{filterDropdown}</div>
      )}

      {viewMode === "columns" ? (
        /* Column View - Exact Kanban Match */
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
          <KanbanBoard className="h-full">
            {filteredGroupedIntroductions.map(renderColumnStage)}
          </KanbanBoard>
        </div>
      ) : (
        /* Row View - List Layout */
        <div className="space-y-4 px-6 md:px-0">
          {filteredGroupedIntroductions.map((stage) => (
            <PipelineRowStageSection
              key={stage.id}
              stage={stage}
              isCollapsed={!!collapsedSections[stage.id]}
              onToggle={() => toggleSection(stage.id)}
              selectedIntro={selectedIntro}
              emailStatus={emailStatus}
              onCardClick={handleCardClick}
              onViewPayout={handleViewPayout}
              onEmailInsights={(introId, e) => {
                e.stopPropagation();
                setSelectedIntroForEmail(introId);
                setEmailTrackingModalOpen(true);
              }}
              onUpdateStage={handleUpdateIntroStage}
              getProgressColor={getProgressColor}
              getNextActionIcon={getNextActionIcon}
              getActualEarnedAmount={getActualEarnedAmount}
            />
          ))}
        </div>
      )}

      {/* Details Modal */}
      <IntroductionDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        introduction={selectedIntroForDetails}
        stageInfo={
          selectedIntroForDetails
            ? getStageInfo(selectedIntroForDetails.stage)
            : null
        }
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

      {/* Payout Details Modal */}
      <PayoutDetailsModal
        open={transactionModalOpen}
        onOpenChange={setTransactionModalOpen}
        introductionRequestId={selectedIntroForTransactions?.id || ""}
        prospectName={selectedIntroForTransactions?.targetName}
      />

      {/* Peer Feedback Modals */}
      {introductions
        .filter((intro) => intro.stage === "peer_feedback")
        .map((intro) => (
          <LeaveFeedbackModal
            key={intro.id}
            isOpen={feedbackModalOpen[intro.id] || false}
            onClose={() => {
              setFeedbackModalOpen((prev) => ({
                ...prev,
                [intro.id]: false,
              }));
            }}
            introductionRequestId={intro.id}
            feedbackToUserId=""
            feedbackToUserName={intro.requesterName}
            feedbackType="peer"
            existingFeedback={getExistingFeedbackFromIntro(intro)}
            onFeedbackSubmitted={() => handleFeedbackSubmitted(intro.id)}
          />
        ))}

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

      {/* Mark Unfulfilled Modal */}
      {selectedIntroForUnfulfilled && (
        <MarkUnfulfilledModal
          isOpen={unfulfilledModalOpen}
          onClose={() => {
            setUnfulfilledModalOpen(false);
            setSelectedIntroForUnfulfilled(null);
          }}
          introductionId={selectedIntroForUnfulfilled.id}
          introductionStage={selectedIntroForUnfulfilled.stage}
          targetName={selectedIntroForUnfulfilled.targetName}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["/api/introduction-requests/connector/pipeline"],
            });
            queryClient.invalidateQueries({
              queryKey: [
                "/api/introduction-requests/introduction-pipeline/stats",
              ],
            });
          }}
        />
      )}

      {/* Reschedule Meeting Confirmation Dialog */}
      <Dialog
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
      >
        <DialogContent
          className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          mobileFullscreen
          hideCloseButton
          onClick={(e) => e.stopPropagation()}
        >
          {/* Hero */}
          <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-6 text-brand-foreground">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
            />
            <DialogClose
              className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-brand-foreground/15 text-brand-foreground transition-colors hover:bg-brand-foreground/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground/60"
              disabled={isRescheduling}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
            <div className="relative flex items-center gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-foreground/20 backdrop-blur">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div className="min-w-0 pr-10">
                <DialogTitle className="text-xl font-extrabold tracking-tight text-brand-foreground">
                  Reschedule Missed Meeting
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] leading-relaxed text-brand-foreground/90">
                  This will resend the same introduction email to{" "}
                  <span className="font-semibold text-brand-foreground">
                    {reschedulingIntro?.targetName}
                  </span>{" "}
                  with a new booking link, giving them another opportunity to
                  schedule a meeting.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {reschedulingIntro?.meetingStartTime && (
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Original meeting was scheduled for
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatMeetingDateWithTimezone(
                    reschedulingIntro.meetingStartTime
                  )}
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-3.5 text-sm font-extrabold text-foreground">
                What happens after reschedule:
              </p>
              <div className="flex flex-col gap-3.5">
                <div className="flex items-start gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-sky/10 text-brand-sky">
                    <Mail className="h-4 w-4" />
                  </div>
                  <p className="pt-1 text-[13.5px] leading-snug text-muted-foreground">
                    The prospect receives the same introduction email with a{" "}
                    <b className="font-bold text-foreground">
                      new booking link
                    </b>
                    , and you receive a{" "}
                    <b className="font-bold text-foreground">CC</b> of the email
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <p className="pt-1 text-[13.5px] leading-snug text-muted-foreground">
                    Prospect picks a{" "}
                    <b className="font-bold text-foreground">
                      new meeting time
                    </b>{" "}
                    from your available booking slots
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-success/10 text-brand-success">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <p className="pt-1 text-[13.5px] leading-snug text-muted-foreground">
                    A new meeting is created and you'll be{" "}
                    <b className="font-bold text-foreground">
                      notified by email
                    </b>{" "}
                    once they book
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 gap-2 border-t border-border bg-card p-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setRescheduleDialogOpen(false);
                setReschedulingIntro(null);
              }}
              disabled={isRescheduling}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              variant="brand"
              onClick={(e) => {
                e.stopPropagation();
                if (reschedulingIntro) {
                  handleRescheduleMeeting(reschedulingIntro);
                }
              }}
              disabled={isRescheduling}
              className="flex-1 sm:flex-none"
            >
              {isRescheduling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rescheduling...
                </>
              ) : (
                <>
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Confirm Reschedule
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
