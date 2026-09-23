import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, ExternalLink, Mail, User } from "lucide-react";
import { utcDayjs } from "@/lib/dayjs";

interface InterviewBookingConfirmationProps {
  meetingDate: string;
  meetingLink: string | null;
  duration: number;
  recruiterName: string;
  jobTitle: string;
  companyName: string;
  timezone: string;
}

/**
 * Content card for the interview-booking confirmation. The full-page wrapper
 * (background, centered card, emerald CheckCircle icon, "Powered by
 * Prospectly" footer) is provided by the parent's `StatusScreen` helper — this
 * component renders only the meeting-details block + "calendar invite sent"
 * note that go inside `<StatusScreen>{children}</StatusScreen>`.
 *
 * Mirrors the already-booked details block from `BookMeetingPublic.tsx` so
 * the two public-booking pages feel like siblings.
 */
export default function InterviewBookingConfirmation({
  meetingDate,
  meetingLink,
  duration,
  recruiterName,
  jobTitle,
  companyName,
  timezone,
}: InterviewBookingConfirmationProps) {
  return (
    <>
      <div className="rounded-xl border border-border bg-secondary p-4 text-left sm:p-5">
        <div className="mb-3 border-b border-border pb-3 text-center">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Interview
          </div>
          <div className="mt-0.5 break-words text-base font-extrabold">
            {jobTitle}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {companyName}
          </div>
        </div>

        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Date
            </div>
            <div className="text-sm font-bold">
              {utcDayjs(meetingDate).tz(timezone).format("dddd, MMMM D, YYYY")}
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-brand-rose/10 text-brand-rose">
            <Clock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Time
            </div>
            <div className="text-sm font-bold">
              {utcDayjs(meetingDate).tz(timezone).format("h:mm A z")} (
              {duration} minutes)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-brand-sky/10 text-brand-sky">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              With
            </div>
            <div className="break-words text-sm font-bold">{recruiterName}</div>
          </div>
        </div>

        {meetingLink && (
          <Button
            asChild
            className="mt-4 w-full bg-brand-gradient text-white shadow-brand-cta hover:shadow-brand-cta-lg"
          >
            <a href={meetingLink} target="_blank" rel="noreferrer">
              <Video className="mr-2 h-4 w-4" />
              Join Meeting
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        )}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-brand-sky/15 bg-brand-sky/5 p-4 text-left text-sm">
        <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-sky" />
        <span className="text-muted-foreground">
          A calendar invite has been sent to your email. You&apos;ll also get a
          reminder before the interview.
        </span>
      </div>
    </>
  );
}
