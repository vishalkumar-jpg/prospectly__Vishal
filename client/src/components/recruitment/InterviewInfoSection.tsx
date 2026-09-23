import { Calendar, Video, Phone, MapPin, ExternalLink } from "lucide-react";
import { formatDateTime } from "@/utils/dateFormatter";
import { canJoinMeeting } from "@/utils/recruitmentDisplay";
import { CandidateApplication } from "@/lib/types/recruitment";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InterviewInfoSectionProps {
  application: CandidateApplication;
}

export function InterviewInfoSection({
  application,
}: InterviewInfoSectionProps) {
  if (
    !(
      (application.status === "interview_scheduled" ||
        application.status === "interview_invite_sent") &&
      application.interviewScheduledAt
    )
  ) {
    return null;
  }

  const showJoin = canJoinMeeting(application);
  const scheduledLabel = formatDateTime(application.interviewScheduledAt);

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-brand-success">
        <Calendar className="h-4 w-4 shrink-0" aria-hidden />
        <span>Interview scheduled at {scheduledLabel}</span>
      </div>
      {application.interviewType && (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          {application.interviewType === "video" ? (
            <Video className="h-4 w-4 shrink-0" />
          ) : application.interviewType === "in_person" ? (
            <MapPin className="h-4 w-4 shrink-0" />
          ) : (
            <Phone className="h-4 w-4 shrink-0" />
          )}
          {application.interviewType === "video"
            ? "Video"
            : application.interviewType === "in_person"
              ? "In-person"
              : "Phone"}{" "}
          Interview
        </span>
      )}
      {application.interviewLocation && (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          {application.interviewLocation}
        </span>
      )}
      {showJoin && (
        <Button
          variant="default"
          size="sm"
          className={cn(
            "h-8 w-full bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
          )}
          asChild
        >
          <a
            href={application.meetingLink!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Join meeting
          </a>
        </Button>
      )}
    </div>
  );
}
