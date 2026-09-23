import { POST_A_JOB_PATH } from "@/constants/recruitment-routes";
import {
  CalendarConnectModal,
  DEFAULT_RECRUITING_NOTE,
} from "@/components/calendar/CalendarConnectModal";

const POST_JOB_CALENDAR_TITLE = "Calendar Connection Required";

interface PostJobCalendarConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostJobCalendarConnectModal({
  open,
  onOpenChange,
}: PostJobCalendarConnectModalProps) {
  return (
    <CalendarConnectModal
      open={open}
      onOpenChange={onOpenChange}
      title={POST_JOB_CALENDAR_TITLE}
      returnTo={POST_A_JOB_PATH}
      variant="recruiting"
      recruitingNote={DEFAULT_RECRUITING_NOTE}
    />
  );
}
