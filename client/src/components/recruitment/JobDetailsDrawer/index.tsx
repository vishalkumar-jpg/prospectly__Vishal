import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { JobHeader } from "./JobHeader";
import { PayoutHighlight, StatsStrip, SalaryNote } from "./JobDetailsGrid";
import { SkillsSection } from "./SkillsSection";
import { JobDetailsContent } from "./JobDetailsContent";
import { ApplicationActions } from "./ApplicationActions";
import {
  publicJobToDisplayData,
  type JobDetailsDisplayData,
} from "../job-details-mappers";
import { usePublicJob } from "@/hooks/usePublicJob";

export interface ReferCandidateJobPayload {
  id: string;
  title: string;
  companyName: string;
}

interface JobDetailsDrawerProps {
  job?: JobDetailsDisplayData | null;
  jobId?: string | null;
  marketplaceJobId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShareJob?: () => void;
  onReferCandidate?: (job: ReferCandidateJobPayload) => void;
  showApplyNow?: boolean;
  includeClosed?: boolean;
  // Sharer code forwarded to the public-job endpoint so the server stamps a
  // share-view event. Used by email-notification deep links.
  shareRef?: string;
  referCount?: number;
  hasSharedLink?: boolean;
}

export default function JobDetailsDrawer({
  job: jobProp,
  jobId,
  marketplaceJobId,
  open,
  onOpenChange,
  onShareJob,
  onReferCandidate,
  showApplyNow = false,
  includeClosed = false,
  shareRef,
  referCount = 0,
  hasSharedLink = false,
}: JobDetailsDrawerProps) {
  const effectiveJobId =
    (jobId || marketplaceJobId) && open ? jobId || marketplaceJobId : null;

  const {
    job: publicJob,
    loading,
    error,
  } = usePublicJob(effectiveJobId ?? undefined, shareRef, includeClosed);

  const job: JobDetailsDisplayData | null = jobProp
    ? jobProp
    : publicJob
      ? publicJobToDisplayData(publicJob)
      : null;

  const isInactive = !!(job?.status && job.status !== "active");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-4xl lg:max-w-5xl !ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=open]:!duration-500 data-[state=closed]:!duration-300 will-change-transform"
      >
        <div className="flex-1 overflow-y-auto bg-app [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5">
          <div className="space-y-6 p-4 sm:p-6">
            {loading && !job ? (
              <>
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
              </>
            ) : error ? (
              <Alert className="border-brand-destructive/30 bg-brand-destructive/10">
                <AlertTriangle className="h-4 w-4 text-brand-destructive" />
                <AlertDescription className="text-brand-destructive">
                  Failed to load job details. Please try again.
                </AlertDescription>
              </Alert>
            ) : job ? (
              <>
                <JobHeader job={job} />
                {isInactive && (
                  <Alert className="border-brand-warning/30 bg-brand-warning/10">
                    <AlertTriangle className="h-4 w-4 text-brand-warning" />
                    <AlertDescription className="text-brand-warning">
                      This role is no longer accepting applications.
                    </AlertDescription>
                  </Alert>
                )}
                <PayoutHighlight job={job} />
                <StatsStrip job={job} />
                <SkillsSection job={job} />
                <SalaryNote job={job} />
                <JobDetailsContent job={job} />
              </>
            ) : null}
          </div>
        </div>

        {job && (
          <ApplicationActions
            job={job}
            showApplyNow={showApplyNow && !isInactive}
            onShareJob={onShareJob}
            onReferCandidate={
              onReferCandidate && job.id
                ? () =>
                    onReferCandidate({
                      id: job.id!,
                      title: job.title,
                      companyName: job.companyName,
                    })
                : undefined
            }
            referDisabled={isInactive}
            referCount={referCount}
            hasSharedLink={hasSharedLink}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
