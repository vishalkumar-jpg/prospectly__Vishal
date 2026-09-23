import {
  Fragment,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useRouteSearch } from "@/hooks/useRouteSearch";
import { useCountriesFromUrl } from "@/hooks/useCountriesFromUrl";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RouteSearchInput } from "@/components/ui/route-search-input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// Filter sheet temporarily disabled (static filter commented out)
// import {
//   Sheet,
//   SheetContent,
//   SheetHeader,
//   SheetTitle,
// } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  ChevronUp,
  // SlidersHorizontal,
} from "lucide-react";
import { LoadMoreLoader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { MarketplaceJob } from "@/types/marketplace";
import { useMarketplaceJobs } from "@/hooks/useMarketplaceJobs";
import { useReferCandidateBankGate } from "@/hooks/useReferCandidateBankGate";
import { api } from "@/lib/api";
import { invalidateConnectorEngagementQueries } from "@/lib/recruitment/invalidate-connector-engagement";
import JobDetailsDrawer from "@/components/recruitment/JobDetailsDrawer";
import { ConnectorResumeUploadModal } from "@/components/recruitment/ConnectorResumeUploadModal";
import { ReferCandidateBankGateModal } from "@/components/recruitment/ReferCandidateBankGateModal";
import { CountryFilterMultiSelect } from "@/components/recruitment/CountryFilterMultiSelect";
import { StripeConnectModal } from "@/components/finance/StripeConnectModal";
import {
  JobCard,
  JobShareModal,
  // MarketplaceFilterRail,
} from "./job-marketplace/components";
import { useJobMarketplaceDeepLink } from "./job-marketplace/use-job-marketplace-deep-link";
import type { ReferCandidateJobPayload } from "@/components/recruitment/JobDetailsDrawer";
import {
  peekReferCandidateReturnContext,
  referPayloadToMarketplaceJob,
} from "@/utils/refer-candidate-return";

const MARKETPLACE_STEPS = [
  {
    title: "Recruiters post open roles",
    description:
      "Recruiters list open roles on Prospectly and define a referral incentive.",
  },
  {
    title: "Connectors refer candidates",
    description: "Connectors introduce candidates who could be a strong fit.",
  },
  {
    title: "Connectors earn rewards",
    description:
      "Connectors receive the payout once a referred candidate is hired.",
  },
] as const;

export default function JobMarketplace() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const { search: searchInput, setSearch: setSearchInput } = useRouteSearch();
  const { countries: selectedCountries, setCountries: setSelectedCountries } =
    useCountriesFromUrl();
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [selectedJob, setSelectedJob] = useState<MarketplaceJob | null>(null);
  const [selectedJobIdForDetails, setSelectedJobIdForDetails] = useState<
    string | null
  >(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // const [filtersOpen, setFiltersOpen] = useState(false);
  const [uploadJob, setUploadJob] = useState<{
    id: string;
    title: string;
    companyName: string;
  } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [restoreDrawerOnUploadClose, setRestoreDrawerOnUploadClose] =
    useState(false);
  const [restoreDrawerOnShareClose, setRestoreDrawerOnShareClose] =
    useState(false);
  // Drawer-only deep-link state. Populated when the user arrives via the
  // email-notification link (`?job=:id&ref=:code`). Cleared on close so manual
  // card clicks fall back to the default (no share-event logging, active-only).
  const [drawerShareRef, setDrawerShareRef] = useState<string | undefined>(
    undefined
  );
  const [drawerIncludeClosed, setDrawerIncludeClosed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pauseDrawerCleanupRef = useRef(false);
  const referResumeCheckedRef = useRef(false);

  // Show scroll-to-top button after scrolling past 800px
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 800);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const {
    jobs,
    totalJobs,
    loading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMarketplaceJobs({
    search: debouncedSearch || undefined,
    countries: selectedCountries.length ? selectedCountries : undefined,
    limit: 10,
  });

  const handleDeepLinkDrawer = useCallback(
    ({ jobId, shareRef }: { jobId: string; shareRef?: string }) => {
      setSelectedJobIdForDetails(jobId);
      setSelectedJob(null);
      setDrawerShareRef(shareRef);
      setDrawerIncludeClosed(true);
      setShowJobModal(true);
    },
    []
  );

  const handleDeepLinkResolveJob = useCallback((job: MarketplaceJob) => {
    setSelectedJob(job);
  }, []);

  const proceedToReferUpload = useCallback(
    (job: ReferCandidateJobPayload, origin: "card" | "drawer") => {
      if (origin === "drawer") {
        pauseDrawerCleanupRef.current = true;
        setRestoreDrawerOnUploadClose(true);
        setUploadJob(job);
        setShowUploadModal(true);
        setShowJobModal(false);
        return;
      }

      setRestoreDrawerOnUploadClose(false);
      setUploadJob(job);
      setShowUploadModal(true);
    },
    []
  );

  const handleResumeDrawer = useCallback(
    (job: ReferCandidateJobPayload) => {
      setSelectedJobIdForDetails(job.id);
      const fromList = jobs.find((item) => item.id === job.id);
      setSelectedJob(fromList ?? referPayloadToMarketplaceJob(job));
      setShowJobModal(true);
      pauseDrawerCleanupRef.current = true;
      setRestoreDrawerOnUploadClose(true);
    },
    [jobs]
  );

  const {
    showBankGate,
    handleBankGateOpenChange,
    showStripeModal,
    pendingJob,
    requestReferCandidate,
    handleSkipBankGate,
    handleOpenStripeModal,
    handleStripeModalClose,
    handleBeforeStripeRedirect,
    handleStripeSuccess,
    resumePendingReferFlow,
    stripeConnectReturnUrl,
    stripeConnectRefreshUrl,
  } = useReferCandidateBankGate({
    onProceed: proceedToReferUpload,
    onResumeDrawer: handleResumeDrawer,
  });

  const handleDeepLinkUpload = useCallback(
    (job: { id: string; title: string; companyName: string }) => {
      requestReferCandidate(job, "card");
    },
    [requestReferCandidate]
  );

  useJobMarketplaceDeepLink({
    urlSearchParams,
    setUrlSearchParams,
    jobs,
    loading,
    toast,
    onOpenDrawer: handleDeepLinkDrawer,
    onResolveSelectedJob: handleDeepLinkResolveJob,
    onOpenUpload: handleDeepLinkUpload,
  });

  useEffect(() => {
    if (!user?.id || referResumeCheckedRef.current) return;
    if (!peekReferCandidateReturnContext()) return;

    referResumeCheckedRef.current = true;
    void resumePendingReferFlow().finally(() => {
      if (urlSearchParams.get("stripeRefer") === "success") {
        const next = new URLSearchParams(urlSearchParams);
        next.delete("stripeRefer");
        setUrlSearchParams(next, { replace: true });
      }
    });
  }, [user?.id, resumePendingReferFlow, urlSearchParams, setUrlSearchParams]);

  const drawerShareJob = useMemo(() => {
    const jobId = selectedJobIdForDetails ?? selectedJob?.id ?? null;

    if (jobId) {
      const fromList = jobs.find((job) => job.id === jobId);
      if (fromList) return fromList;
    }

    if (selectedJob) return selectedJob;
    if (!selectedJobIdForDetails) return null;

    if (pendingJob?.id === selectedJobIdForDetails) {
      return referPayloadToMarketplaceJob(pendingJob);
    }

    return null;
  }, [jobs, pendingJob, selectedJob, selectedJobIdForDetails]);

  const handleUploadResume = (job: MarketplaceJob) => {
    requestReferCandidate(
      {
        id: job.id,
        title: job.title,
        companyName: job.companyName,
      },
      "card"
    );
  };

  const handleReferFromDrawer = useCallback(
    (job: ReferCandidateJobPayload) => {
      requestReferCandidate(job, "drawer");
    },
    [requestReferCandidate]
  );

  const handleDrawerOpenChange = useCallback((open: boolean) => {
    setShowJobModal(open);
    if (!open) {
      if (pauseDrawerCleanupRef.current) {
        pauseDrawerCleanupRef.current = false;
        return;
      }
      setRestoreDrawerOnUploadClose(false);
      setSelectedJobIdForDetails(null);
      setSelectedJob(null);
      setDrawerShareRef(undefined);
      setDrawerIncludeClosed(false);
      setShowUploadModal(false);
      setUploadJob(null);
    }
  }, []);

  const handleUploadModalOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        pauseDrawerCleanupRef.current = false;
        const shouldRestoreDrawer = restoreDrawerOnUploadClose;
        setShowUploadModal(false);
        setUploadJob(null);
        setRestoreDrawerOnUploadClose(false);
        if (shouldRestoreDrawer) {
          setShowJobModal(true);
        }
        return;
      }
      setShowUploadModal(true);
    },
    [restoreDrawerOnUploadClose]
  );

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleViewJob = (job: MarketplaceJob) => {
    setSelectedJob(job);
    setSelectedJobIdForDetails(job.id);
    setShowJobModal(true);
  };

  const handleShareJob = (
    job: MarketplaceJob,
    options?: { fromDrawer?: boolean }
  ) => {
    if (options?.fromDrawer) {
      pauseDrawerCleanupRef.current = true;
      setRestoreDrawerOnShareClose(true);
      setShowJobModal(false);
    }
    setSelectedJob(job);
    setShowShareModal(true);
  };

  const handleShareModalOpenChange = useCallback(
    (open: boolean) => {
      setShowShareModal(open);
      if (!open) {
        void invalidateConnectorEngagementQueries(queryClient);
        if (restoreDrawerOnShareClose) {
          pauseDrawerCleanupRef.current = false;
          setRestoreDrawerOnShareClose(false);
          setShowJobModal(true);
        }
      }
    },
    [queryClient, restoreDrawerOnShareClose]
  );

  const handleShareClick = async (
    jobId: string,
    platform: string
  ): Promise<{ sharerCode: string; shareUrl: string } | null> => {
    try {
      const result = await api.recruitment.shareJob({ jobId, platform });
      void invalidateConnectorEngagementQueries(queryClient);
      return {
        sharerCode: result.sharerCode,
        shareUrl: result.shareUrl,
      };
    } catch (error) {
      toast({
        title: "Failed to generate share link",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await refetch();

      if (result.isError || result.error) {
        toast({
          title: "Refresh failed",
          description:
            result.error?.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Refreshed",
          description: "Job listings are up to date.",
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <main className="space-y-6 px-2 py-4 sm:px-4 md:px-6">
      <SEO title="Job Marketplace | Prospectly" />

      <div>
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-brand-gradient sm:text-3xl">
          Job Marketplace
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search for open roles and refer candidates that would be a great fit.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-3">
          {MARKETPLACE_STEPS.map((step, index) => (
            <Fragment key={step.title}>
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-extrabold text-brand-foreground shadow-brand-cta">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-bold leading-snug text-foreground">
                    {step.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < MARKETPLACE_STEPS.length - 1 && (
                <ArrowRight
                  aria-hidden
                  className="mx-1 hidden h-5 w-5 shrink-0 self-center text-muted-foreground/50 lg:block"
                />
              )}
            </Fragment>
          ))}
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <span className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">{jobs.length}</span>{" "}
          of {totalJobs} jobs
        </span>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <RouteSearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by title, company..."
            className="w-full sm:w-72"
            inputClassName="h-10 text-sm bg-background"
            aria-label="Search jobs by title or company"
          />
          <div className="flex items-center gap-2">
            <CountryFilterMultiSelect
              value={selectedCountries}
              onChange={setSelectedCountries}
              className="min-w-0 flex-1 sm:flex-none"
            />
            {/* Filters trigger temporarily disabled (static filter commented out)
            <Button
              variant="outline"
              size="sm"
              className="h-10 shrink-0 gap-2 lg:hidden"
              onClick={() => setFiltersOpen(true)}
              aria-label="Open filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
            */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 shrink-0 gap-2"
                    onClick={handleRefresh}
                    disabled={isRefreshing || loading}
                    aria-label="Refresh job listings"
                  >
                    <RefreshCw
                      className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                    />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reload job listings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* LAYOUT: sticky filter rail + job grid (filter rail temporarily disabled) */}
      <div className="grid grid-cols-1 items-start gap-5">
        {/* <aside className="sticky top-4 hidden max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-sm lg:block">
          <MarketplaceFilterRail />
        </aside> */}

        <div className="min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-[330px] rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <Card className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-destructive/10 text-brand-destructive">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Something went wrong</h3>
              <p className="mb-6 text-muted-foreground">
                Failed to load marketplace jobs. Please try again.
              </p>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </Card>
          ) : jobs.length === 0 ? (
            <Card className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
                <Briefcase className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-xl font-bold">No Jobs Found</h3>
              <p className="mb-6 text-muted-foreground">
                {searchInput || selectedCountries.length
                  ? "No jobs match your search criteria. Try adjusting your filters."
                  : "No jobs available at the moment. Check back soon!"}
              </p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onViewJob={handleViewJob}
                    onShareJob={handleShareJob}
                    onUploadResume={handleUploadResume}
                  />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-1" />

              {/* Loading next page */}
              {isFetchingNextPage && <LoadMoreLoader />}

              {/* End of list */}
              {!hasNextPage && jobs.length > 0 && (
                <p className="py-8 text-center text-sm italic text-muted-foreground">
                  You've reached the end
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile / tablet filter sheet temporarily disabled (static filter commented out)
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="left" className="w-[300px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <MarketplaceFilterRail />
          </div>
        </SheetContent>
      </Sheet>
      */}

      <JobDetailsDrawer
        marketplaceJobId={selectedJobIdForDetails}
        open={showJobModal}
        onOpenChange={handleDrawerOpenChange}
        shareRef={drawerShareRef}
        includeClosed={drawerIncludeClosed}
        onReferCandidate={handleReferFromDrawer}
        onShareJob={
          drawerShareJob
            ? () => handleShareJob(drawerShareJob, { fromDrawer: true })
            : undefined
        }
        referCount={drawerShareJob?.myReferCount ?? 0}
        hasSharedLink={drawerShareJob?.hasSharedLink ?? false}
      />

      <JobShareModal
        job={selectedJob}
        open={showShareModal}
        onOpenChange={handleShareModalOpenChange}
        onShareClick={handleShareClick}
        onShareSuccess={() => invalidateConnectorEngagementQueries(queryClient)}
      />

      {uploadJob && (
        <ConnectorResumeUploadModal
          open={showUploadModal}
          onOpenChange={handleUploadModalOpenChange}
          jobId={uploadJob.id}
          jobTitle={uploadJob.title}
          jobCompany={uploadJob.companyName}
        />
      )}

      <ReferCandidateBankGateModal
        open={showBankGate}
        onOpenChange={handleBankGateOpenChange}
        jobTitle={pendingJob?.title}
        onConnectBank={handleOpenStripeModal}
        onSkip={handleSkipBankGate}
      />

      <StripeConnectModal
        isOpen={showStripeModal}
        onClose={handleStripeModalClose}
        onSuccess={handleStripeSuccess}
        onBeforeStripeRedirect={handleBeforeStripeRedirect}
        connectReturnUrl={stripeConnectReturnUrl}
        connectRefreshUrl={stripeConnectRefreshUrl}
      />

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-brand-gradient text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </main>
  );
}
