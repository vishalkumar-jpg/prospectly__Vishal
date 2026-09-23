import { Button } from "@/components/ui/button";
import { ConnectorJobActionButtons } from "@/components/recruitment/ConnectorJobActionButtons";
import type { JobDetailsDisplayData } from "../job-details-mappers";

interface ApplicationActionsProps {
  job: JobDetailsDisplayData;
  showApplyNow: boolean;
  onShareJob?: () => void;
  onReferCandidate?: () => void;
  referDisabled?: boolean;
  referCount?: number;
  hasSharedLink?: boolean;
}

export function ApplicationActions({
  job,
  showApplyNow,
  onShareJob,
  onReferCandidate,
  referDisabled = false,
  referCount = 0,
  hasSharedLink = false,
}: ApplicationActionsProps) {
  if (!showApplyNow && !onShareJob && !onReferCandidate) return null;

  return (
    <div className="border-t bg-background">
      <div className="flex flex-col gap-2 p-4 sm:px-6">
        <ConnectorJobActionButtons
          referCount={referCount}
          hasSharedLink={hasSharedLink}
          onRefer={onReferCandidate && !referDisabled ? onReferCandidate : undefined}
          onShare={onShareJob}
          layout="drawer"
        />
        {showApplyNow && job.id && (
          <Button variant="brand" size="lg" className="w-full sm:w-auto" asChild>
            <a
              href={`/jobs/${job.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Apply Now
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
