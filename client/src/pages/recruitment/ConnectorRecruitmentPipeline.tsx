import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { PipelineTabs } from "@/components/pipeline/PipelineTabs";
import { useToast } from "@/hooks/use-toast";
import { useJobPoolMatches } from "@/hooks/useJobPoolMatches";
import { useClosedJobPoolMatches } from "@/hooks/useClosedJobPoolMatches";
import { Inbox, Archive } from "lucide-react";
import type { InboxJob, ClosedInboxJob } from "./connector-pipeline/types";
import JobDetailsDrawer from "@/components/recruitment/JobDetailsDrawer";
import InboxTab from "./connector-pipeline/InboxTab";
import ClosedTab from "./connector-pipeline/ClosedTab";
import { useRouteTab } from "@/hooks/useRouteTab";
import { useRouteSearch } from "@/hooks/useRouteSearch";
import { REFER_CANDIDATES_TABS, TAB_ROUTE_BASES } from "@/lib/tab-routes";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useConnectorReferShareModals } from "@/hooks/useConnectorReferShareModals";

type ConnectorReferTab = (typeof REFER_CANDIDATES_TABS)[number];

export default function ConnectorRecruitmentPipeline() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useRouteTab<ConnectorReferTab>({
    basePath: TAB_ROUTE_BASES.referCandidates,
    allowedTabs: REFER_CANDIDATES_TABS,
    defaultTab: "inbox",
  });
  const { search: searchTerm, setSearch: setSearchTerm } = useRouteSearch();
  const debouncedSearch = useDebouncedValue(searchTerm, 400);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedJobIdForDetails, setSelectedJobIdForDetails] = useState<
    string | null
  >(null);
  const [selectedJobIsClosed, setSelectedJobIsClosed] = useState(false);
  const [showJobDetailsPopup, setShowJobDetailsPopup] = useState(false);
  const [closedPage, setClosedPage] = useState(1);
  const inboxScrollRef = useRef<HTMLDivElement>(null);

  const handleViewJobDetails = (job: InboxJob | ClosedInboxJob) => {
    setSelectedJobIdForDetails(job.jobId);
    setSelectedJobIsClosed("closedAt" in job);
    setShowJobDetailsPopup(true);
  };

  const { handleRefer, handleShare, modals } = useConnectorReferShareModals();

  const handleViewCandidates = (job: InboxJob) => {
    navigate(`/recruiting/refer-candidates/inbox/${job.jobId}`);
  };

  useEffect(() => {
    setClosedPage(1);
  }, [debouncedSearch]);

  const {
    jobs: matchedJobs,
    totalJobs: inboxTotalJobs,
    loading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches,
    fetchNextPage: fetchNextInboxPage,
    hasNextPage: hasNextInboxPage,
    isFetchingNextPage: isFetchingNextInboxPage,
  } = useJobPoolMatches({
    limit: 10,
    search: activeTab === "inbox" ? debouncedSearch || undefined : undefined,
    enabled: activeTab === "inbox",
  });
  const {
    jobs: closedMatchedJobs,
    loading: closedLoading,
    error: closedError,
    refetch: refetchClosed,
    pagination: closedPagination,
  } = useClosedJobPoolMatches({
    page: closedPage,
    search: activeTab === "closed" ? debouncedSearch || undefined : undefined,
    enabled: activeTab === "closed",
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result =
        activeTab === "inbox" ? await refetchMatches() : await refetchClosed();
      if (result?.isError) {
        throw result.error ?? new Error("Refetch failed");
      }
      toast({
        title: "Refreshed",
        description: `Successfully updated ${activeTab} data.`,
      });
    } catch {
      toast({
        title: "Refresh Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const inboxJobs: InboxJob[] = useMemo(() => {
    return matchedJobs.map((job) => ({
      jobId: job.jobId,
      jobTitle: job.jobTitle,
      jobCompany: job.jobCompany,
      jobLocation: job.jobLocation,
      bountyAmount: job.bountyAmount,
      jobDescription: job.jobDescription,
      jobRequiredSkills: job.jobRequiredSkills,
      jobPreferredSkills: job.jobPreferredSkills,
      jobSalaryRangeMin: job.jobSalaryRangeMin,
      jobSalaryRangeMax: job.jobSalaryRangeMax,
      jobSalaryCurrency: job.jobSalaryCurrency,
      jobSalaryPeriod: job.jobSalaryPeriod,
      jobSalaryRangeNotes: null,
      jobPostedAt: job.jobPostedAt,
      candidateCount: job.candidateCount,
      myReferCount: job.myReferCount,
      hasSharedLink: job.hasSharedLink,
      connectorPayout: job.connectorPayout,
      sharerPayout: job.sharerPayout,
    }));
  }, [matchedJobs]);

  const closedInboxJobs: ClosedInboxJob[] = useMemo(() => {
    return closedMatchedJobs.map((job) => ({
      jobId: job.jobId,
      jobTitle: job.jobTitle,
      jobCompany: job.jobCompany,
      jobLocation: job.jobLocation,
      bountyAmount: job.bountyAmount,
      jobDescription: job.jobDescription,
      jobRequiredSkills: job.jobRequiredSkills,
      jobPreferredSkills: job.jobPreferredSkills,
      jobSalaryRangeMin: job.jobSalaryRangeMin,
      jobSalaryRangeMax: job.jobSalaryRangeMax,
      jobSalaryCurrency: job.jobSalaryCurrency,
      jobSalaryPeriod: job.jobSalaryPeriod,
      jobSalaryRangeNotes: null,
      jobPostedAt: job.jobPostedAt,
      closedAt: job.closedAt,
      closedReason: job.closedReason,
      myReferCount: job.myReferCount,
      hasSharedLink: job.hasSharedLink,
      connectorPayout: job.connectorPayout,
      sharerPayout: job.sharerPayout,
      candidates: job.candidates.map((c) => ({
        matchId: c.matchId,
        contactId: c.contactId,
        status: c.status,
        source: c.source,
        candidateName: c.candidateName,
        candidateEmail: c.candidateEmail,
        candidateTitle: c.candidateTitle,
        candidateCompany: c.candidateCompany,
        matchScore: parseFloat(c.matchScore) || 0,
        cosineSimilarity: c.cosineSimilarity
          ? parseFloat(c.cosineSimilarity)
          : null,
        llmScore: c.llmScore ? parseFloat(c.llmScore) : null,
        matchedSignals: (c.matchedSignals as string[]) ?? [],
        concerns: (c.concerns as string[]) ?? [],
        gapAnalysis: c.gapAnalysis ?? null,
        consentDeclineReason: c.consentDeclineReason ?? null,
        consentDeclineNotes: c.consentDeclineNotes ?? null,
        connectorDeclineReason: c.connectorDeclineReason ?? null,
        connectorDeclinedAt: c.connectorDeclinedAt ?? null,
        consentRespondedAt: c.consentRespondedAt ?? null,
        matchedAt: c.matchedAt,
      })),
    }));
  }, [closedMatchedJobs]);

  const inboxJobCount = inboxTotalJobs;
  const closedJobCount = closedPagination?.totalJobs ?? 0;

  const drawerJob = useMemo(() => {
    if (!selectedJobIdForDetails) return null;
    return [...inboxJobs, ...closedInboxJobs].find(
      (item) => item.jobId === selectedJobIdForDetails
    );
  }, [closedInboxJobs, inboxJobs, selectedJobIdForDetails]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <SEO title="Refer Candidates | Prospectly" />
      <div className="flex-shrink-0 px-4 sm:px-6 pt-4">
        <PageHeader
          title="Refer Candidates"
          description="Track your candidate referrals and earnings"
        />
      </div>

      <div className="flex-shrink-0 mx-4 sm:mx-6 pt-4">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ConnectorReferTab)}
          className="w-full flex flex-col"
        >
          <PipelineTabs
            tabs={[
              {
                value: "inbox",
                label: "Inbox",
                icon: Inbox,
                badge: inboxJobCount > 0 ? inboxJobCount : undefined,
                color: "blue",
              },
              {
                value: "closed",
                label: "Closed",
                icon: Archive,
                badge: closedJobCount > 0 ? closedJobCount : undefined,
                color: "emerald",
              },
            ]}
            activeTab={activeTab}
            onTabChange={(v) => setActiveTab(v as ConnectorReferTab)}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            showSearch
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search candidates, jobs..."
            containerMinWidth="min-w-[550px]"
            tabsListMinWidth="min-w-[300px]"
            tabsListMaxWidth="max-w-md"
          />
        </Tabs>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === "closed" ? (
          <div className="mx-2 sm:mx-3 md:mx-4 lg:mx-6 overflow-y-auto thin-scroll pb-6">
            <ClosedTab
              jobs={closedInboxJobs}
              loading={closedLoading}
              error={closedError as Error | null}
              onViewJobDetails={handleViewJobDetails}
              onRetry={refetchClosed}
              pagination={closedPagination}
              onPageChange={setClosedPage}
              searchTerm={debouncedSearch}
            />
          </div>
        ) : (
          <div
            ref={inboxScrollRef}
            className="mx-2 sm:mx-3 md:mx-4 lg:mx-6 overflow-y-auto thin-scroll pb-6"
          >
            <InboxTab
              jobs={inboxJobs}
              loading={matchesLoading}
              error={matchesError as Error | null}
              onViewCandidates={handleViewCandidates}
              onViewJobDetails={handleViewJobDetails}
              onReferJob={(job) =>
                handleRefer({
                  id: job.jobId,
                  title: job.jobTitle,
                  companyName: job.jobCompany,
                  bountyAmount: job.bountyAmount,
                  connectorPayout: job.connectorPayout,
                  sharerPayout: job.sharerPayout,
                })
              }
              onShareJob={(job) =>
                handleShare({
                  id: job.jobId,
                  title: job.jobTitle,
                  companyName: job.jobCompany,
                  bountyAmount: job.bountyAmount,
                  connectorPayout: job.connectorPayout,
                  sharerPayout: job.sharerPayout,
                })
              }
              onRetry={refetchMatches}
              searchTerm={debouncedSearch}
              scrollContainerRef={inboxScrollRef}
              hasMore={hasNextInboxPage}
              isLoadingMore={isFetchingNextInboxPage}
              onLoadMore={fetchNextInboxPage}
            />
          </div>
        )}
      </div>

      <JobDetailsDrawer
        jobId={selectedJobIdForDetails}
        open={showJobDetailsPopup}
        onOpenChange={(open) => {
          setShowJobDetailsPopup(open);
          if (!open) {
            setSelectedJobIdForDetails(null);
            setSelectedJobIsClosed(false);
          }
        }}
        includeClosed={selectedJobIsClosed}
        referCount={drawerJob?.myReferCount ?? 0}
        hasSharedLink={drawerJob?.hasSharedLink ?? false}
        onReferCandidate={(job) => handleRefer(job)}
        onShareJob={
          drawerJob
            ? () =>
                handleShare({
                  id: drawerJob.jobId,
                  title: drawerJob.jobTitle,
                  companyName: drawerJob.jobCompany,
                  bountyAmount: drawerJob.bountyAmount,
                  connectorPayout: drawerJob.connectorPayout,
                  sharerPayout: drawerJob.sharerPayout,
                })
            : undefined
        }
      />

      {modals}
    </div>
  );
}
