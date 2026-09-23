import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils/dateFormatter";
import { getCandidateTimelineLabel } from "@/utils/candidateApplicationTimelineLabel";
import { CandidateApplication } from "@/lib/types/recruitment";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History } from "lucide-react";

interface ApplicationTimelineProps {
  application: CandidateApplication;
}

const TIMELINE_COLUMN_CLASS =
  "lg:w-[40%] lg:min-w-[340px] lg:max-w-[480px] lg:shrink-0";

export function ApplicationTimeline({ application }: ApplicationTimelineProps) {
  return (
    <>
      {/* Desktop: reserves column width without stretching row height */}
      <div
        className={cn("hidden lg:block", TIMELINE_COLUMN_CLASS)}
        aria-hidden
      />
      <div
        className={cn(
          "flex flex-col w-full",
          TIMELINE_COLUMN_CLASS,
          "border-t pt-4 lg:border-t-0 lg:border-l lg:pl-4",
          "lg:absolute lg:inset-y-0 lg:right-0"
        )}
      >
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <History className="h-3 w-3 text-muted-foreground" aria-hidden />
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Timeline
        </h4>
        <span className="text-xs text-muted-foreground">
          {application.timeline.length} events
        </span>
      </div>
      <ScrollArea className="h-[240px] lg:flex-1 lg:min-h-0 pr-2">
        <div className="relative pb-1">
          <div className="absolute left-[5px] top-2.5 bottom-2.5 w-px bg-border" />

          <div className="space-y-4">
            {application.timeline.map((event, i) => (
              <div key={i} className="flex gap-4 relative">
                <div className="relative z-10 mt-[5px]">
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full flex-shrink-0",
                      i === application.timeline.length - 1
                        ? "bg-brand-amethyst"
                        : "bg-border"
                    )}
                  />
                </div>

                <div className="min-w-0 pb-4">
                  <p className="text-sm font-semibold text-foreground leading-snug break-words">
                    {getCandidateTimelineLabel(event.status, event.note)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateTime(event.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
      </div>
    </>
  );
}
