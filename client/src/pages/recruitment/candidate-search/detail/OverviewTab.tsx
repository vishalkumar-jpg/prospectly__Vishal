import { Calendar, Sparkles, Video } from "lucide-react";
import { DATE_FORMATS } from "@/constants/date";
import { utcDayjs } from "@/lib/dayjs";
import { isHttpOrHttpsUrl } from "@/lib/url-utils";
import { redactSensitiveText } from "@/utils/redactSensitiveText";
import type { CandidateDetailResponse } from "@/lib/api/recruitment";
import { DetailSectionCard } from "./DetailSectionCard";

export function AiSummarySection({
  summary,
  isHidden,
}: {
  summary: string | null;
  isHidden: boolean;
}) {
  if (!summary) return null;
  return (
    <DetailSectionCard title="AI Summary" icon={Sparkles}>
      <p className="text-sm leading-relaxed text-foreground/80">
        {isHidden ? redactSensitiveText(summary) : summary}
      </p>
    </DetailSectionCard>
  );
}

export function InterviewSection({
  interview,
  compact = false,
}: {
  interview: NonNullable<CandidateDetailResponse["interview"]>;
  compact?: boolean;
}) {
  return (
    <DetailSectionCard title="Interview" icon={Calendar} compact={compact}>
      <dl
        className={
          compact ? "grid gap-4 text-sm" : "grid gap-4 text-sm sm:grid-cols-2"
        }
      >
        <div>
          <dt className="text-xs text-muted-foreground">Scheduled</dt>
          <dd className="mt-0.5 font-semibold">
            {utcDayjs(interview.scheduledAt)
              .local()
              .format(DATE_FORMATS.US_DATETIME)}
          </dd>
        </div>
        {interview.meetingLink ? (
          <div>
            <dt className="text-xs text-muted-foreground">Meeting</dt>
            <dd className="mt-0.5">
              {isHttpOrHttpsUrl(interview.meetingLink) ? (
                <a
                  href={interview.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-brand-sky transition-colors hover:underline"
                >
                  <Video className="h-3.5 w-3.5" aria-hidden /> Join meeting
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-brand-sky">
                  <Video className="h-3.5 w-3.5" aria-hidden />
                  {interview.meetingLink}
                </span>
              )}
            </dd>
          </div>
        ) : null}
        {interview.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Notes</dt>
            <dd className="mt-0.5">{interview.notes}</dd>
          </div>
        ) : null}
      </dl>
    </DetailSectionCard>
  );
}
