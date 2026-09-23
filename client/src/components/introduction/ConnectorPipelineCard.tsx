import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Building2,
  Eye,
  Globe,
  Receipt,
  Video,
  MessageSquare,
  CheckCircle,
  Handshake,
  AlertCircle,
  Calendar,
  RefreshCcw,
  AlertTriangle,
  Clock,
  XCircle,
  Mail,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { Progress } from "@/components/ui/progress";
import { StarRating } from "@/components/shared/StarRating";
import { MeetingSchedulingActions } from "./MeetingSchedulingActions";
import {
  formatLastActivity,
  formatMeetingDate,
  formatMeetingDateWithTimezone,
} from "@/utils/dateFormatting";
import { utcDayjs } from "@/lib/dayjs";
import { AccountDeletedInfo } from "./AccountDeletedInfo";
import { isMarkUnsuccessfulHidden } from "@/utils/unsuccessfulTimeGate";

export interface ActiveIntroduction {
  id: string;
  requesterName: string;
  requesterCompany: string;
  requesterPhotoUrl?: string | null;
  requesterId?: string;
  targetName: string;
  targetCompany: string;
  targetPhotoUrl?: string | null;
  bountyAmount: number;
  stage: string;
  lastActivity: string;
  lastActivityTimestamp?: string;
  createdAt?: string | null;
  nextAction: string;
  progress: number;
  meetingDate?: string;
  meetingStartTime?: string;
  meetingTimezone?: string;
  requesterMeetingUrl?: string;
  rating?: number;
  feedbackComments?: string;
  meetingTitle?: string | null;
  meetingDescription?: string | null;
  additionalContext?: string | null;
  isRequester?: boolean;
  payoutReleased?: boolean;
  payoutTriggeredBy?: "trust_score" | "peer_feedback" | null;
  initialChargeAmount?: number | null;
  initialChargeCaptured?: boolean;
  initialChargeCapturedAt?: string | null;
  remainingChargeAmount?: number | null;
  remainingChargeCaptured?: boolean;
  remainingChargeCapturedAt?: string | null;
  platformCommissionAmount?: number | null;
  connectorPayoutAmount?: number | null;
  targetTitle?: string | null;
  targetIndustry?: string | null;
  requesterTitle?: string | null;
  requesterIndustry?: string | null;
}

interface ConnectorPipelineCardProps {
  intro: ActiveIntroduction;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpansion: (e: React.MouseEvent) => void;
  onCardClick: () => void;
  onViewTransactions: (e: React.MouseEvent) => void;
  onLeaveFeedback: (e: React.MouseEvent) => void;
  onMarkUnsuccessful?: (e: React.MouseEvent) => void;
  onRescheduleMeeting?: (e: React.MouseEvent) => void;
  onEmailInsights?: (e: React.MouseEvent) => void;
  onUpdateStage: () => void;
  getProgressColor: (progress: number) => string;
  unsuccessfulTimePeriodDays?: number;
}

const ACTION_BUTTON_STRETCH = "w-full min-w-0";
const BASE_BLUE_ACTION_BUTTON_CLASS =
  "flex items-center justify-center gap-1.5 h-8 px-1.5 rounded-lg bg-blue-50/50 text-slate-900 border border-blue-200/60 font-medium cursor-pointer transition-all hover:bg-blue-100 dark:bg-blue-950/30 dark:text-slate-100 dark:border-blue-800/40 hover:shadow-sm active:scale-[0.98]";
const RED_ACTION_BUTTON_CLASS =
  "flex items-center justify-center gap-1.5 h-8 px-1.5 rounded-lg bg-red-50/50 text-red-700 border border-red-200/60 font-medium cursor-pointer transition-all hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300 hover:shadow-sm active:scale-[0.98]";
const GREEN_ACTION_BUTTON_CLASS =
  "flex items-center justify-center gap-1.5 h-8 px-1.5 rounded-lg bg-green-50/50 text-green-700 border border-green-200/60 font-medium cursor-pointer transition-all hover:bg-green-100 dark:bg-green-950/30 dark:text-green-300 hover:shadow-sm active:scale-[0.98]";

interface CardActionItem {
  key: string;
  label: string;
  tooltip: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: (event: React.MouseEvent) => void;
  buttonClassName: string;
  ariaLabel?: string;
}

interface MeetingDetailsParams {
  meetingStartTime?: string;
  meetingDate?: string;
  stage: string;
}

interface MeetingState {
  hasMeetingInfo: boolean;
  isRescheduled: boolean;
  isPastMeetingStart: boolean;
}

const UNKNOWN_REQUESTER_NAMES = new Set([
  "Unknown",
  "Unknown Requester",
  "Unknown User",
]);

const isPastDate = (date?: string) =>
  !!date && utcDayjs(date).isBefore(utcDayjs());

const isFutureDate = (date?: string) =>
  !!date && utcDayjs(date).isAfter(utcDayjs());

const isKnownRequesterName = (requesterName?: string) =>
  !!requesterName && !UNKNOWN_REQUESTER_NAMES.has(requesterName);

const hasKnownValue = (value?: string | null, unknownValue?: string) =>
  !!value && value !== unknownValue;

const getMeetingState = ({
  meetingStartTime,
  meetingDate,
  stage,
}: MeetingDetailsParams): MeetingState => {
  const effectiveMeetingDate = meetingStartTime || meetingDate;
  const isPastMeetingStart = isPastDate(effectiveMeetingDate);

  return {
    hasMeetingInfo:
      !!(meetingStartTime || meetingDate) && stage !== "meeting_rescheduled",
    isRescheduled: stage === "meeting_rescheduled",
    isPastMeetingStart,
  };
};

const ActionButtonWithTooltip = ({ item }: { item: CardActionItem }) => {
  const Icon = item.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(event) => {
            event.stopPropagation();
            item.onClick(event);
          }}
          className={cn(ACTION_BUTTON_STRETCH, item.buttonClassName)}
          aria-label={item.ariaLabel}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[12px]">{item.label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{item.tooltip}</TooltipContent>
    </Tooltip>
  );
};

const buildCardActions = ({
  intro,
  onCardClick,
  onViewTransactions,
  onLeaveFeedback,
  onMarkUnsuccessful,
  onRescheduleMeeting,
  onEmailInsights,
  unsuccessfulTimePeriodDays = 0,
}: Pick<
  ConnectorPipelineCardProps,
  | "intro"
  | "onCardClick"
  | "onViewTransactions"
  | "onLeaveFeedback"
  | "onMarkUnsuccessful"
  | "onRescheduleMeeting"
  | "onEmailInsights"
  | "unsuccessfulTimePeriodDays"
>): {
  primaryActions: CardActionItem[];
  markUnsuccessfulAction: CardActionItem | null;
} => {
  const primaryActions: CardActionItem[] = [
    {
      key: "details",
      label: "Details",
      tooltip: "View details",
      icon: Eye,
      onClick: () => onCardClick(),
      buttonClassName: BASE_BLUE_ACTION_BUTTON_CLASS,
      ariaLabel: "View details",
    },
  ];

  const showEmail =
    (intro.stage === "intro_sent" || intro.stage === "meeting_rescheduled") &&
    !!onEmailInsights;
  if (showEmail) {
    primaryActions.push({
      key: "email",
      label: "Email",
      tooltip: "Email Insights",
      icon: Mail,
      onClick: (event) => onEmailInsights?.(event),
      buttonClassName: BASE_BLUE_ACTION_BUTTON_CLASS,
    });
  }

  if (intro.stage !== "intro_sent") {
    primaryActions.push({
      key: "finance",
      label: "Finance",
      tooltip: "View Transactions",
      icon: Receipt,
      onClick: (event) => onViewTransactions(event),
      buttonClassName: BASE_BLUE_ACTION_BUTTON_CLASS,
      ariaLabel: "View payout",
    });
  }

  const stageAllowsUnsuccessful =
    intro.stage === "intro_sent" ||
    intro.stage === "meeting_booked" ||
    intro.stage === "meeting_rescheduled";
  const notInHideWindow = !isMarkUnsuccessfulHidden(
    intro.createdAt,
    unsuccessfulTimePeriodDays
  );
  const markUnsuccessfulAction: CardActionItem | null =
    stageAllowsUnsuccessful && notInHideWindow && onMarkUnsuccessful
      ? {
          key: "unsuccessful",
          label: "Mark as Unsuccessful",
          tooltip: "Mark as Unsuccessful",
          icon: XCircle,
          onClick: (event) => onMarkUnsuccessful(event),
          buttonClassName: RED_ACTION_BUTTON_CLASS,
        }
      : null;

  const showReschedule =
    intro.stage === "meeting_booked" &&
    isPastDate(intro.meetingStartTime || intro.meetingDate) &&
    !!onRescheduleMeeting;
  if (showReschedule) {
    primaryActions.push({
      key: "reschedule",
      label: "Reschedule",
      tooltip: "Reschedule Meeting",
      icon: RefreshCcw,
      onClick: (event) => onRescheduleMeeting?.(event),
      buttonClassName: BASE_BLUE_ACTION_BUTTON_CLASS,
    });
  }

  if (intro.stage === "peer_feedback") {
    const hasRating = intro.rating !== undefined && intro.rating !== null;
    primaryActions.push({
      key: "feedback",
      label: hasRating ? "Edit" : "Feedback",
      tooltip: hasRating ? "Edit Feedback" : "Feedback",
      icon: MessageSquare,
      onClick: (event) => onLeaveFeedback(event),
      buttonClassName: GREEN_ACTION_BUTTON_CLASS,
    });
  }

  const showJoin =
    intro.stage === "meeting_booked" &&
    !!intro.requesterMeetingUrl &&
    (!intro.meetingStartTime || isFutureDate(intro.meetingStartTime));
  if (showJoin) {
    primaryActions.push({
      key: "join",
      label: "Join",
      tooltip: "Join meeting",
      icon: Video,
      onClick: () => window.open(intro.requesterMeetingUrl || "", "_blank"),
      buttonClassName: BASE_BLUE_ACTION_BUTTON_CLASS,
    });
  }

  return { primaryActions, markUnsuccessfulAction };
};

const ActionButtonsSection = ({
  intro,
  onCardClick,
  onViewTransactions,
  onLeaveFeedback,
  onMarkUnsuccessful,
  onRescheduleMeeting,
  onEmailInsights,
  unsuccessfulTimePeriodDays = 0,
}: Pick<
  ConnectorPipelineCardProps,
  | "intro"
  | "onCardClick"
  | "onViewTransactions"
  | "onLeaveFeedback"
  | "onMarkUnsuccessful"
  | "onRescheduleMeeting"
  | "onEmailInsights"
  | "unsuccessfulTimePeriodDays"
>) => {
  const { primaryActions, markUnsuccessfulAction } = buildCardActions({
    intro,
    onCardClick,
    onViewTransactions,
    onLeaveFeedback,
    onMarkUnsuccessful,
    onRescheduleMeeting,
    onEmailInsights,
    unsuccessfulTimePeriodDays,
  });
  const primaryCount = primaryActions.length;
  const usePrimaryGrid = primaryCount >= 3;
  const primaryRowClass = cn(
    "gap-1.5",
    usePrimaryGrid ? "grid grid-cols-2" : "flex flex-nowrap"
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col gap-1.5 pt-1">
        <div className={primaryRowClass}>
          {primaryActions.map((item, index) => (
            <div
              key={item.key}
              className={cn(
                usePrimaryGrid ? "min-w-0 w-full" : "min-w-0 flex-1 basis-0",
                usePrimaryGrid &&
                  primaryCount === 3 &&
                  index === primaryCount - 1 &&
                  "col-span-2"
              )}
            >
              <ActionButtonWithTooltip item={item} />
            </div>
          ))}
        </div>
        {markUnsuccessfulAction && (
          <div className="w-full">
            <ActionButtonWithTooltip item={markUnsuccessfulAction} />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

const MeetingTitleSection = ({ intro }: { intro: ActiveIntroduction }) => (
  <div className="flex justify-between items-start pl-0 pr-0">
    {intro.meetingTitle && (
      <div
        className="text-[13px] font-bold text-foreground leading-tight flex-1 text-wrap line-clamp-2"
        title={intro.meetingTitle}
      >
        {intro.meetingTitle}
      </div>
    )}
    <div className="text-[16px] font-bold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent flex-shrink-0 ml-4">
      ${intro.bountyAmount.toLocaleString()}
    </div>
  </div>
);

const TargetSection = ({ intro }: { intro: ActiveIntroduction }) => {
  if (intro.targetName === "User's Account deleted") {
    return (
      <div className="flex-1 flex items-center min-h-[40px]">
        <AccountDeletedInfo variant="purple" className="w-full" />
      </div>
    );
  }

  return (
    <>
      <PremiumAvatar
        name={intro.targetName}
        size="xs"
        qualityScore={8}
        imageUrl={intro.targetPhotoUrl}
      />
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="font-medium text-[12px] leading-snug break-words">
          {intro.targetName}
        </div>
        {intro.targetTitle && (
          <div
            className="text-[12px] text-muted-foreground mt-1 break-words line-clamp-2 font-medium"
            title={intro.targetTitle}
          >
            {intro.targetTitle}
          </div>
        )}
      </div>
    </>
  );
};

const RequesterSection = ({ intro }: { intro: ActiveIntroduction }) => {
  if (
    intro.requesterName === "User's Account deleted" ||
    !isKnownRequesterName(intro.requesterName)
  ) {
    return null;
  }

  const showRequesterCompany = hasKnownValue(
    intro.requesterCompany,
    "Unknown Company"
  );
  const showRequesterIndustry = hasKnownValue(
    intro.requesterIndustry,
    "Unknown Industry"
  );

  return (
    <div className="flex flex-row items-center gap-x-1 text-[12px] flex-shrink-0">
      <Handshake className="h-3.5 w-3.5 text-primary/70" />
      <span className="leading-none font-semibold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
        Requester:
      </span>{" "}
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-pointer text-muted-foreground font-medium hover:text-foreground transition-colors leading-none truncate block mt-[2px] text-[12px]">
              {intro.requesterName}
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="start"
            className="p-0 overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-800 shadow-2xl w-64 z-[100]"
          >
            <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <PremiumAvatar
                  name={intro.requesterName}
                  size="xs"
                  imageUrl={intro.requesterPhotoUrl}
                />
                <div className="min-w-0">
                  <div className="font-bold text-[12px] text-foreground truncate">
                    {intro.requesterName}
                  </div>
                  {intro.requesterTitle && (
                    <div
                      className="text-[12px] text-muted-foreground truncate leading-tight mt-0.5"
                      title={intro.requesterTitle}
                    >
                      {intro.requesterTitle}
                    </div>
                  )}
                </div>
              </div>
              {(showRequesterCompany || showRequesterIndustry) && (
                <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {showRequesterCompany && (
                    <div className="flex items-center gap-2.5 text-[12px]">
                      <Building2 className="h-3.5 w-3.5 text-primary/60" />
                      <span className="font-semibold text-foreground truncate">
                        {intro.requesterCompany}
                      </span>
                    </div>
                  )}
                  {showRequesterIndustry && (
                    <div className="flex items-center gap-2.5 text-[12px]">
                      <Globe className="h-3.5 w-3.5 text-primary/60" />
                      <span className="text-muted-foreground truncate">
                        {intro.requesterIndustry}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

const PeopleSection = ({ intro }: { intro: ActiveIntroduction }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-3 w-full min-h-[40px]">
      <TargetSection intro={intro} />
    </div>
    <div className="px-0">
      <RequesterSection intro={intro} />
    </div>
  </div>
);

const MeetingDateSection = ({ intro }: { intro: ActiveIntroduction }) => {
  const { hasMeetingInfo, isRescheduled, isPastMeetingStart } = getMeetingState(
    {
      meetingStartTime: intro.meetingStartTime,
      meetingDate: intro.meetingDate,
      stage: intro.stage,
    }
  );

  if (hasMeetingInfo) {
    return (
      <div
        className={`flex flex-col gap-1 w-full p-2 rounded-lg border shadow-sm ${
          isPastMeetingStart
            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50 text-red-700 hover:bg-red-700 hover:text-red-50 dark:text-red-400"
            : "bg-gradient-to-br from-green-500/15 to-green-500/5 text-green-700 dark:text-green-400 border-green-500/30"
        }`}
      >
        <div className="flex items-center gap-2.5 text-[12px] font-bold leading-tight">
          <Calendar className="h-4 w-4 flex-shrink-0 drop-shadow-sm" />
          <span className="truncate">
            {intro.meetingStartTime
              ? formatMeetingDateWithTimezone(intro.meetingStartTime)
              : formatMeetingDate(intro.meetingDate)}
          </span>
        </div>
        {isPastMeetingStart && (
          <span className="text-[12px] font-bold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Needs Rescheduling
          </span>
        )}
      </div>
    );
  }

  if (isRescheduled) {
    return (
      <div className="flex items-center gap-2.5 text-[12px] bg-gradient-to-br from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-400 p-3 rounded-lg w-full font-bold border border-amber-500/30 shadow-sm leading-tight">
        <RefreshCcw className="h-4 w-4 flex-shrink-0 drop-shadow-sm" />
        <span className="truncate">Rescheduled - Awaiting new time</span>
      </div>
    );
  }

  return (
    <div className="text-[12px] text-muted-foreground italic px-2 font-medium">
      No meeting scheduled yet
    </div>
  );
};

const PaymentInfoSection = ({ intro }: { intro: ActiveIntroduction }) => (
  <div className="bg-gradient-to-br from-primary/8 to-primary/12 p-3 rounded-lg border border-primary/25 shadow-sm">
    <div className="space-y-2 text-[12px]">
      <div className="flex justify-between">
        <span className="text-muted-foreground font-medium">
          Total Referral Payout
        </span>
        <span className="font-bold text-foreground">
          ${intro.bountyAmount.toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between">
        <span
          className={`flex items-center gap-1 ${
            intro.initialChargeCaptured
              ? "text-red-600"
              : "text-muted-foreground"
          }`}
        >
          {intro.initialChargeCaptured ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <Clock className="h-3 w-3" />
          )}
          {intro.initialChargeCaptured ? "Intro Sent" : "On Intro Sent"} (5%)
        </span>
        <span
          className={`font-bold ${
            intro.initialChargeCaptured
              ? "text-red-600"
              : "text-muted-foreground"
          }`}
        >
          $
          {intro.initialChargeAmount?.toLocaleString() ??
            Math.round(intro.bountyAmount * 0.05).toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between">
        <span
          className={`flex items-center gap-1 ${
            intro.remainingChargeCaptured
              ? "text-red-600"
              : "text-muted-foreground"
          }`}
        >
          {intro.remainingChargeCaptured ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <Clock className="h-3 w-3" />
          )}
          {intro.remainingChargeCaptured
            ? "Meeting Booked"
            : "On Meeting Booked"}{" "}
          (95%)
        </span>
        <span
          className={`font-bold ${
            intro.remainingChargeCaptured
              ? "text-red-600"
              : "text-muted-foreground"
          }`}
        >
          $
          {intro.remainingChargeAmount?.toLocaleString() ??
            Math.round(intro.bountyAmount * 0.95).toLocaleString()}
        </span>
      </div>
    </div>
  </div>
);

const FooterSection = ({ intro }: { intro: ActiveIntroduction }) => (
  <div className="pt-3 mt-3 border-t border-muted">
    <div className="flex items-center justify-between text-[12px]">
      <div className="flex items-center gap-2 text-muted-foreground font-medium">
        <Clock className="h-3.5 w-3.5" />
        <span>
          {formatLastActivity(intro.lastActivityTimestamp, intro.lastActivity)}
        </span>
      </div>
      {intro.rating != null && (
        <div className="flex items-center gap-1 drop-shadow-sm">
          <StarRating rating={intro.rating} size="sm" colorScheme="yellow" />
        </div>
      )}
    </div>
  </div>
);

const ExpandedContent = ({
  intro,
  isExpanded,
  getProgressColor,
  onUpdateStage,
}: Pick<
  ConnectorPipelineCardProps,
  "intro" | "isExpanded" | "getProgressColor" | "onUpdateStage"
>) => (
  <div
    className={cn(
      "overflow-hidden transition-all duration-300 ease-in-out",
      isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
    )}
  >
    <CardContent className="pt-3 flex-1 flex flex-col justify-between space-y-3">
      {intro.stage === "peer_feedback" && (
        <div className="p-2.5 bg-yellow-50 border-2 border-yellow-500 rounded-lg flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-yellow-900 font-semibold leading-tight">
            Complete feedback to earn trust score (required for new requests)
          </p>
        </div>
      )}

      <div className="min-h-[38px] flex items-center">
        <MeetingDateSection intro={intro} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[12px]">
          <span className="font-bold">Progress</span>
          <span className="font-extrabold text-primary text-[12px]">
            {intro.progress}%
          </span>
        </div>
        <Progress
          value={intro.progress}
          className={`h-2.5 shadow-sm ${getProgressColor(intro.progress)}`}
        />
      </div>

      <PaymentInfoSection intro={intro} />
      <FooterSection intro={intro} />

      <div
        className="flex flex-col gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        <MeetingSchedulingActions
          stage={intro.stage}
          requesterName={intro.requesterName}
          targetName={intro.targetName}
          meetingDate={intro.meetingDate}
          introductionRequestId={intro.id}
          isRequester={false}
          renderAcknowledgeButton={false}
          renderFeedbackButton={false}
          acknowledgeDialogOpen={false}
          onAcknowledgeDialogOpenChange={() => {}}
          onUpdateStage={onUpdateStage}
        />
      </div>
    </CardContent>
  </div>
);

export const ConnectorPipelineCard: React.FC<ConnectorPipelineCardProps> = ({
  intro,
  isExpanded,
  isSelected,
  onToggleExpansion,
  onCardClick,
  onViewTransactions,
  onLeaveFeedback,
  onMarkUnsuccessful,
  onRescheduleMeeting,
  onEmailInsights,
  onUpdateStage,
  getProgressColor,
  unsuccessfulTimePeriodDays = 0,
}) => (
  <Card
    onClick={onToggleExpansion}
    className={cn(
      "flex flex-col transition-all duration-300 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-none cursor-pointer hover:-translate-y-0.5 hover:border-[#D2D6E0] hover:shadow-[0_4px_14px_rgba(11,16,32,0.06)]",
      isSelected && "ring-1 ring-primary border-primary",
      isExpanded && "min-h-[360px]"
    )}
  >
    <CardHeader className="relative p-[15px] flex-shrink-0 bg-transparent transition-colors overflow-hidden space-y-3">
      <MeetingTitleSection intro={intro} />
      <PeopleSection intro={intro} />
      <ActionButtonsSection
        intro={intro}
        onCardClick={onCardClick}
        onViewTransactions={onViewTransactions}
        onLeaveFeedback={onLeaveFeedback}
        onMarkUnsuccessful={onMarkUnsuccessful}
        onRescheduleMeeting={onRescheduleMeeting}
        onEmailInsights={onEmailInsights}
        unsuccessfulTimePeriodDays={unsuccessfulTimePeriodDays}
      />
    </CardHeader>
    <ExpandedContent
      intro={intro}
      isExpanded={isExpanded}
      getProgressColor={getProgressColor}
      onUpdateStage={onUpdateStage}
    />
  </Card>
);
