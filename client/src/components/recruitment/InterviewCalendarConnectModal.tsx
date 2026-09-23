import {
  CalendarConnectModal,
  type CalendarConnectRecruitingNote,
} from "@/components/calendar/CalendarConnectModal";

export type InterviewCalendarConnectAction = "invite" | "reschedule" | "resend";

const ACTION_TITLE: Record<InterviewCalendarConnectAction, string> = {
  invite: "Connect your calendar to send interview invites",
  reschedule: "Connect your calendar to reschedule this interview",
  resend: "Connect your calendar to resend the invite",
};

const INTERVIEW_RECRUITING_NOTE: CalendarConnectRecruitingNote = {
  emphasis: "Required to schedule interviews",
  text: "Candidates pick a time from your connected-calendar availability. After connecting, you'll return here to continue.",
};

interface InterviewCalendarConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: InterviewCalendarConnectAction;
  returnTo: string;
}

export function InterviewCalendarConnectModal({
  open,
  onOpenChange,
  action,
  returnTo,
}: InterviewCalendarConnectModalProps) {
  return (
    <CalendarConnectModal
      open={open}
      onOpenChange={onOpenChange}
      title={ACTION_TITLE[action]}
      returnTo={returnTo}
      variant="recruiting"
      recruitingNote={INTERVIEW_RECRUITING_NOTE}
    />
  );
}
