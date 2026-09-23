import React from "react";
import { CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  Calendar,
  RefreshCcw,
  AlertTriangle,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { StarRating } from "@/components/shared/StarRating";
import { MeetingSchedulingActions } from "./MeetingSchedulingActions";
import {
  formatLastActivity,
  formatMeetingDate,
  formatMeetingDateWithTimezone,
} from "@/utils/dateFormatting";
import { utcDayjs } from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { RequestedIntroduction } from "./IntroductionRequestCard";

interface RequestCardContentProps {
  intro: RequestedIntroduction;
  getProgressColor: (progress: number) => string;
  acknowledgeDialogOpen: boolean;
  onAcknowledgeDialogOpenChange: (open: boolean) => void;
  onUpdateStage: () => void;
}

function isMeetingStartPastDue({
  meetingStartTime,
}: {
  meetingStartTime?: string;
}): boolean {
  return !!meetingStartTime && utcDayjs(meetingStartTime).isBefore(utcDayjs());
}

function getMeetingDateContainerClass({
  meetingStartTime,
}: {
  meetingStartTime?: string;
}): string {
  if (isMeetingStartPastDue({ meetingStartTime })) {
    return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50 text-red-700 hover:bg-red-700 hover:text-red-50 dark:text-red-400";
  }
  return "bg-gradient-to-br from-green-500/15 to-green-500/5 text-green-700 dark:text-green-400 border-green-500/30";
}

function RequestCardMeetingDateSection({
  intro,
}: {
  intro: RequestedIntroduction;
}) {
  const hasScheduledMeeting =
    (intro.meetingStartTime || intro.meetingDate) &&
    intro.stage !== "meeting_rescheduled";

  if (hasScheduledMeeting) {
    const pastDue = isMeetingStartPastDue({
      meetingStartTime: intro.meetingStartTime,
    });
    return (
      <div
        className={cn(
          "flex flex-col gap-1 w-full p-2 rounded-lg border shadow-sm",
          getMeetingDateContainerClass({
            meetingStartTime: intro.meetingStartTime,
          })
        )}
      >
        <div className="flex items-center gap-2.5 text-[12px] font-bold leading-tight">
          <Calendar className="h-4 w-4 flex-shrink-0 drop-shadow-sm" />
          <span className="truncate">
            {intro.meetingStartTime
              ? formatMeetingDateWithTimezone(intro.meetingStartTime)
              : formatMeetingDate(intro.meetingDate)}
          </span>
        </div>
        {pastDue && (
          <span className="text-[12px] font-bold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Needs Rescheduling
          </span>
        )}
      </div>
    );
  }

  if (intro.stage === "meeting_rescheduled") {
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
}

function RequestCardPaymentChargeRow({
  captured,
  labelPending,
  labelCaptured,
  percentLabel,
  paymentFailed,
  amount,
}: {
  captured?: boolean;
  labelPending: string;
  labelCaptured: string;
  percentLabel: string;
  paymentFailed: boolean;
  amount: string;
}) {
  const capturedClass = captured ? "text-red-600" : "text-muted-foreground";
  return (
    <div className="flex justify-between">
      <span className={cn("flex items-center gap-1", capturedClass)}>
        {captured ? (
          <CheckCircle className="h-3 w-3" />
        ) : (
          <Clock className="h-3 w-3" />
        )}
        {captured ? labelCaptured : labelPending} {percentLabel}{" "}
        {paymentFailed && <AlertCircle className="h-3 w-3 text-red-500" />}
      </span>
      <span className={cn("font-bold", capturedClass)}>${amount}</span>
    </div>
  );
}

export const RequestCardContent: React.FC<RequestCardContentProps> = ({
  intro,
  getProgressColor,
  acknowledgeDialogOpen,
  onAcknowledgeDialogOpenChange,
  onUpdateStage,
}) => {
  const initialAmount =
    intro.initialChargeAmount?.toLocaleString() ??
    Math.round(intro.bountyAmount * 0.05).toLocaleString();
  const remainingAmount =
    intro.remainingChargeAmount?.toLocaleString() ??
    Math.round(intro.bountyAmount * 0.95).toLocaleString();

  return (
    <CardContent className="pt-3 flex-1 flex flex-col justify-between space-y-3">
      {intro.stage === "peer_feedback" && (
        <div className="p-2.5 bg-yellow-50 border-2 border-yellow-500 rounded-lg flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-[12px] text-yellow-900 font-semibold leading-tight">
            Complete feedback to earn trust score (required for new requests)
          </p>
        </div>
      )}

      <div className="bg-gradient-to-br from-muted/30 to-muted/10 p-3 rounded-lg border border-muted/40">
        <div className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground/70 mb-1.5">
          Purpose
        </div>
        <p className="text-[12px] text-foreground leading-relaxed line-clamp-3 font-medium">
          {intro.purpose}
        </p>
      </div>

      <div className="min-h-[38px] flex items-center">
        <RequestCardMeetingDateSection intro={intro} />
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
          className={cn("h-2.5 shadow-sm", getProgressColor(intro.progress))}
        />
      </div>

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
          <RequestCardPaymentChargeRow
            captured={intro.initialChargeCaptured}
            labelPending="On Intro Sent"
            labelCaptured="Intro Sent"
            percentLabel="(5%)"
            paymentFailed={intro.initialPaymentStatus === "failed"}
            amount={initialAmount}
          />
          <RequestCardPaymentChargeRow
            captured={intro.remainingChargeCaptured}
            labelPending="On Meeting Booked"
            labelCaptured="Meeting Booked"
            percentLabel="(95%)"
            paymentFailed={intro.remainingPaymentStatus === "failed"}
            amount={remainingAmount}
          />
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-muted">
        <div className="flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {formatLastActivity(
                intro.lastActivityTimestamp,
                intro.lastActivity
              )}
            </span>
          </div>
          {intro.rating != null && (
            <div className="flex items-center gap-1 drop-shadow-sm">
              <StarRating
                rating={intro.rating}
                size="sm"
                colorScheme="yellow"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
        <MeetingSchedulingActions
          stage={intro.stage}
          requesterName={intro.prospectName}
          targetName={intro.connectorName || "Connector"}
          meetingDate={intro.meetingDate}
          introductionRequestId={intro.id}
          isRequester={true}
          renderAcknowledgeButton={false}
          renderFeedbackButton={false}
          acknowledgeDialogOpen={acknowledgeDialogOpen}
          onAcknowledgeDialogOpenChange={onAcknowledgeDialogOpenChange}
          onUpdateStage={onUpdateStage}
        />
      </div>
    </CardContent>
  );
};
