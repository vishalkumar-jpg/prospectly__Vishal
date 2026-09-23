import { useEffect, useRef } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import type { MarketplaceJob } from "@/types/marketplace";

export interface UploadJobPayload {
  id: string;
  title: string;
  companyName: string;
}

interface UseJobMarketplaceDeepLinkOptions {
  urlSearchParams: URLSearchParams;
  setUrlSearchParams: SetURLSearchParams;
  jobs: MarketplaceJob[];
  loading: boolean;
  toast: (props: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void;
  onOpenDrawer: (params: { jobId: string; shareRef?: string }) => void;
  onResolveSelectedJob: (job: MarketplaceJob) => void;
  onOpenUpload: (job: UploadJobPayload) => void;
}

function publicJobToMarketplaceJob(
  publicJob: Awaited<ReturnType<typeof api.recruitment.getPublicJob>>
): MarketplaceJob {
  return {
    id: publicJob.id,
    title: publicJob.title,
    companyName: publicJob.companyName,
    description: publicJob.description,
    location: publicJob.location,
    salaryRangeMin: publicJob.salaryRangeMin,
    salaryRangeMax: publicJob.salaryRangeMax,
    salaryCurrency: publicJob.salaryCurrency,
    salaryPeriod: publicJob.salaryPeriod,
    salaryRangeNotes: publicJob.salaryRangeNotes,
    bountyAmount: publicJob.bountyAmount,
    connectorPayout: publicJob.connectorPayout,
    sharerPayout: publicJob.sharerPayout,
    requiredSkills: publicJob.requiredSkills,
    preferredSkills: publicJob.preferredSkills,
    createdAt: publicJob.createdAt,
    viewCount: 0,
  };
}

function toUploadPayload(job: {
  id: string;
  title: string;
  companyName: string;
}): UploadJobPayload {
  return {
    id: job.id,
    title: job.title,
    companyName: job.companyName,
  };
}

export function useJobMarketplaceDeepLink({
  urlSearchParams,
  setUrlSearchParams,
  jobs,
  loading,
  toast,
  onOpenDrawer,
  onResolveSelectedJob,
  onOpenUpload,
}: UseJobMarketplaceDeepLinkOptions): void {
  const deepLinkHandledRef = useRef(false);

  useEffect(() => {
    if (deepLinkHandledRef.current || loading) return;

    const jobId = urlSearchParams.get("job");
    if (!jobId) return;

    const action = urlSearchParams.get("action");
    const ref = urlSearchParams.get("ref") ?? undefined;
    const openUploadOnly = action === "upload";

    deepLinkHandledRef.current = true;
    setUrlSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("job");
        next.delete("ref");
        next.delete("action");
        return next;
      },
      { replace: true }
    );

    if (openUploadOnly) {
      const existingJob = jobs.find((j) => j.id === jobId) ?? null;
      if (existingJob) {
        onOpenUpload(toUploadPayload(existingJob));
        return;
      }

      api.recruitment
        .getPublicJob(jobId)
        .then((publicJob) => {
          onOpenUpload(toUploadPayload(publicJobToMarketplaceJob(publicJob)));
        })
        .catch(() => {
          toast({
            title: "Job not found",
            description: "The job from the link could not be loaded.",
            variant: "destructive",
          });
        });
      return;
    }

    onOpenDrawer({ jobId, shareRef: ref });

    const existingJob = jobs.find((j) => j.id === jobId) ?? null;
    if (existingJob) {
      onResolveSelectedJob(existingJob);
      return;
    }

    api.recruitment
      .getPublicJob(jobId)
      .then((publicJob) => {
        onResolveSelectedJob(publicJobToMarketplaceJob(publicJob));
      })
      .catch(() => {
        // Drawer still opens via its own usePublicJob fetch; only the share
        // CTA is unavailable in this rare failure case.
      });
  }, [
    urlSearchParams,
    jobs,
    loading,
    setUrlSearchParams,
    toast,
    onOpenDrawer,
    onResolveSelectedJob,
    onOpenUpload,
  ]);
}
