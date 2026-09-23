import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import {
  PageStatCard,
  PAGE_STATS_ROW_END_CLASS,
  PAGE_STAT_CARD_LG_WIDTH_CLASS,
} from "@/components/ui/page-stat-card";
import { htmlToPlainText } from "@/lib/rich-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs } from "@/components/ui/tabs";
import { PipelineTabs } from "@/components/pipeline/PipelineTabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadMoreLoader } from "@/components/ui/loader";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Briefcase,
  Plus,
  MoreVertical,
  Edit,
  MapPin,
  ArrowRight,
  Building2,
  Calendar,
  Eye,
  AlertTriangle,
  Ban,
  ChevronUp,
  RefreshCw,
  Loader2,
  Archive,
  RotateCcw,
  Trophy,
  Send,
  CheckCircle2,
  Users,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useRecruitmentJobs,
  useRecruitmentJobStats,
  useCloseRecruitmentJob,
  useReopenRecruitmentJob,
} from "@/hooks/useRecruitmentJobs";
import { formatLocalizedShortDate } from "@/utils/dateFormatter";
import {
  formatSalaryPeriod,
  formatSalaryRange,
  isValidSalaryRange,
} from "@/utils/formatter";
import type { RecruitmentJobListItem } from "@/lib/api/recruitment";
import SendNotificationModal from "./components/SendNotificationModal";
import ManageCollaboratorsModal from "./components/ManageCollaboratorsModal";
import { useRouteTab } from "@/hooks/useRouteTab";
import { useRouteSearch } from "@/hooks/useRouteSearch";
import { useCountriesFromUrl } from "@/hooks/useCountriesFromUrl";
import { MY_JOB_POSTS_TABS, TAB_ROUTE_BASES } from "@/lib/tab-routes";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { PostJobCalendarConnectModal } from "@/components/recruitment/PostJobCalendarConnectModal";
import { usePostJobCalendarGuard } from "@/hooks/usePostJobCalendarGuard";
import { CountryFilterMultiSelect } from "@/components/recruitment/CountryFilterMultiSelect";
import { JobLifecycleNotificationFields } from "@/components/recruitment/JobLifecycleNotificationFields";
import {
  expandJobCloseStageKeysFromApi,
  normalizeJobCloseStageKeysForApi,
} from "@/lib/job-close-notification.constants";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";

type JobPostsTab = (typeof MY_JOB_POSTS_TABS)[number];

const statusConfig: Record<string, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-brand-success/10 text-brand-success border-brand-success/30",
  },
  closed: {
    label: "Closed",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export default function MyJobPostings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    attemptPostJobNavigation,
    isModalOpen,
    setIsModalOpen,
    loading: calendarGuardLoading,
  } = usePostJobCalendarGuard();
  const [activeTab, setActiveTab] = useRouteTab<JobPostsTab>({
    basePath: TAB_ROUTE_BASES.myJobPosts,
    allowedTabs: MY_JOB_POSTS_TABS,
    defaultTab: "active",
  });
  const { search: searchInput, setSearch: setSearchInput } = useRouteSearch();
  const { countries: selectedCountries, setCountries: setSelectedCountries } =
    useCountriesFromUrl();
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [closeJobTarget, setCloseJobTarget] =
    useState<RecruitmentJobListItem | null>(null);
  const [reopenJobTarget, setReopenJobTarget] =
    useState<RecruitmentJobListItem | null>(null);
  const [closeReason, setCloseReason] = useState("");
  const [closeReasonError, setCloseReasonError] = useState<string | null>(null);
  const [sendCloseNotifications, setSendCloseNotifications] = useState(false);
  const [closeNotifyStages, setCloseNotifyStages] = useState<string[]>([]);
  const [sendReopenNotifications, setSendReopenNotifications] = useState(false);
  const [reopenNotifyStages, setReopenNotifyStages] = useState<string[]>([]);
  const [notifyJobTarget, setNotifyJobTarget] =
    useState<RecruitmentJobListItem | null>(null);
  const [manageCollabTarget, setManageCollabTarget] =
    useState<RecruitmentJobListItem | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const resetCloseDialog = () => {
    setCloseJobTarget(null);
    setCloseReason("");
    setCloseReasonError(null);
    setSendCloseNotifications(false);
    setCloseNotifyStages([]);
  };

  const resetReopenDialog = () => {
    setReopenJobTarget(null);
    setSendReopenNotifications(false);
    setReopenNotifyStages([]);
  };

  const closeJobMutation = useCloseRecruitmentJob();
  const reopenJobMutation = useReopenRecruitmentJob();
  const isClosing = closeJobMutation.isPending;
  const isReopening = reopenJobMutation.isPending;

  const navigateToJobPipeline = useCallback(
    (jobId: string) => {
      navigate(`${TAB_ROUTE_BASES.myJobPosts}/${jobId}`, {
        state:
          activeTab === "closed" ? { jobsTab: "closed" as const } : undefined,
      });
    },
    [activeTab, navigate]
  );

  const { totalJobs, activeJobs, closedJobs } = useRecruitmentJobStats();
  const {
    jobs,
    totalJobs: filteredTotalJobs,
    loading,
    isFetching,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRecruitmentJobs({
    status: activeTab || "active",
    search: debouncedSearch || undefined,
    countries: selectedCountries.length ? selectedCountries : undefined,
    limit: 10,
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await refetch();
      if (result.isError || result.error) {
        toast({
          title: "Refresh failed",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Refreshed",
        description: "Your job posts are up to date.",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, toast]);

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

  // Scroll-to-top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 800);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleJobAction = (action: string, job: RecruitmentJobListItem) => {
    switch (action) {
      case "view":
        navigateToJobPipeline(job.id);
        break;
      case "edit":
        navigate(`/recruiting/my-job-posts/${job.id}/edit`);
        break;
      case "close":
        setCloseJobTarget(job);
        break;
      case "notify":
        setNotifyJobTarget(job);
        break;
      case "collaborators":
        setManageCollabTarget(job);
        break;
      case "reopen": {
        const lastClose = job.notificationSnapshot?.lastClose;
        setReopenJobTarget(job);
        setSendReopenNotifications(lastClose?.sendNotifications ?? false);
        setReopenNotifyStages(
          expandJobCloseStageKeysFromApi(lastClose?.candidateStageKeys)
        );
        break;
      }
    }
  };

  const JobCard = ({ job }: { job: RecruitmentJobListItem }) => {
    const config = statusConfig[job.status] || statusConfig.closed;
    const isOwner = job.accessRole === "owner";
    const perCandidateCost =
      job.totalAmount != null && job.totalAmount !== ""
        ? Number(job.totalAmount)
        : null;
    // Salary range is optional — hide the salary line when not provided.
    const salaryMin = Number(job.salaryRangeMin);
    const salaryMax = Number(job.salaryRangeMax);
    const hasValidSalary = isValidSalaryRange(salaryMin, salaryMax);

    const hasStatusBadge = job.status !== "active";
    const hasCollaboratorBadge = !isOwner;
    const hasNotificationBadge = Boolean(job.notification);
    const hasTopBadges =
      hasStatusBadge || hasCollaboratorBadge || hasNotificationBadge;

    return (
      <Card className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-brand-card">
        <CardContent className="relative flex flex-1 flex-col p-[18px]">
          <div className="absolute right-[18px] top-[18px] z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-[30px] w-[30px] shrink-0 rounded-[9px] border border-border bg-muted p-0 text-muted-foreground transition-colors hover:border-brand-amethyst/20 hover:bg-card hover:text-brand-amethyst"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isOwner ? (
                  <DropdownMenuItem
                    onClick={() => navigateToJobPipeline(job.id)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Candidates
                  </DropdownMenuItem>
                ) : job.status === "closed" ? (
                  <>
                    <DropdownMenuItem
                      onClick={() =>
                        navigate(`/recruiting/my-job-posts/${job.id}/view`)
                      }
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleJobAction("collaborators", job)}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Manage Collaborators
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleJobAction("reopen", job)}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reopen Job Post
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() => handleJobAction("edit", job)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleJobAction("collaborators", job)}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Manage Collaborators
                    </DropdownMenuItem>
                    {job.status === "active" &&
                      job.notification?.status !== "sending" &&
                      job.notification?.status !== "pending" && (
                        <DropdownMenuItem
                          onClick={() => handleJobAction("notify", job)}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          {job.notification
                            ? "Resend Notification"
                            : "Send Notification"}
                        </DropdownMenuItem>
                      )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleJobAction("close", job)}
                      className="text-brand-destructive focus:text-brand-destructive"
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Close Job Post
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {hasTopBadges ? (
            <div className="mb-2 flex flex-wrap items-center gap-1.5 pr-10">
              {hasStatusBadge ? (
                <Badge
                  variant="outline"
                  className={cn("text-xs font-medium", config.className)}
                >
                  {config.label}
                </Badge>
              ) : null}
              {hasCollaboratorBadge ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-blue-500/30 bg-blue-500/10 text-xs font-medium text-blue-600"
                >
                  <Users className="h-3 w-3" />
                  Collaborator
                </Badge>
              ) : null}
              {hasNotificationBadge ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-brand-success/30 bg-brand-success/10 text-xs font-medium text-brand-success"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {job.notification?.status === "sending"
                    ? "Sending notification…"
                    : `Notified · ${job.notification!.sendCount.toLocaleString()} time${job.notification!.sendCount === 1 ? "" : "s"}`}
                </Badge>
              ) : null}
            </div>
          ) : null}

          {/* Job Title */}
          <h3
            className={cn(
              "mb-2 line-clamp-2 min-h-[2.6rem] cursor-pointer text-[15px] font-medium leading-snug tracking-tight text-foreground transition-colors group-hover:text-brand-amethyst",
              !hasTopBadges && "pr-10"
            )}
            onClick={() => navigateToJobPipeline(job.id)}
          >
            {job.title}
          </h3>

          {/* Company & Location */}
          <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {job.companyName}
            </span>
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.location}
              </span>
            )}
          </div>

          {/* Description */}
          {job.description && (
            <p className="mb-3 line-clamp-2 text-[12.4px] leading-relaxed text-muted-foreground">
              {htmlToPlainText(job.description)}
            </p>
          )}

          {/* Salary (left) · Per Candidate (right) */}
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[11px] border border-border bg-muted/40 px-3 py-2 text-xs">
            {hasValidSalary ? (
              <span className="flex min-w-0 items-center gap-1">
                <span className="text-muted-foreground">Salary:</span>
                <span className="font-semibold text-foreground">
                  {formatSalaryRange(salaryMin, salaryMax, job.salaryCurrency)}
                </span>
                {job.salaryPeriod && (
                  <span className="text-[11px] text-muted-foreground">
                    / {formatSalaryPeriod(job.salaryPeriod)}
                  </span>
                )}
              </span>
            ) : (
              <span />
            )}
            <span className="flex shrink-0 items-center gap-1 sm:ml-auto">
              <span className="text-muted-foreground">Per Candidate:</span>
              <span className="font-semibold text-foreground">
                $
                {perCandidateCost != null
                  ? formatMoneyWithCommas(perCandidateCost)
                  : "TBD"}
              </span>
            </span>
          </div>

          {job.hasSuccessFee && job.successFeeAmount && (
            <div className="mb-2.5">
              <Badge
                variant="outline"
                className="gap-1 border-brand-amethyst/30 bg-brand-amethyst/10 text-[11px] font-medium text-brand-amethyst"
              >
                <Trophy className="h-3 w-3" />
                Success Fee $
                {formatMoneyWithCommas(Number(job.successFeeAmount))}
                {job.probationPeriodDays != null &&
                  job.probationPeriodDays > 0 && (
                    <> · {job.probationPeriodDays}D</>
                  )}
              </Badge>
            </div>
          )}

          {job.status === "closed" && job.closedReason ? (
            <div className="mb-2.5 flex items-start gap-2 rounded-lg bg-brand-amethyst/10 p-2.5 text-xs text-brand-amethyst">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="w-full cursor-default rounded text-left leading-relaxed line-clamp-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst/50"
                  >
                    <span className="font-semibold">Note: </span>
                    {job.closedReason}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-sm text-sm leading-relaxed"
                >
                  {job.closedReason}
                </TooltipContent>
              </Tooltip>
            </div>
          ) : null}

          {/* Footer: Date (left) + View Candidates (right) */}
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-dashed border-border pt-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {job.status === "closed" && job.closedAt ? (
                  <span>
                    Closed At {formatLocalizedShortDate(job.closedAt)}
                  </span>
                ) : (
                  <span>Posted {formatLocalizedShortDate(job.createdAt)}</span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {job.viewCount} views
              </span>
            </div>
            <div className="relative ml-auto w-fit">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateToJobPipeline(job.id)}
                className="bg-brand-amethyst/10 text-brand-amethyst border-brand-amethyst/30 hover:bg-brand-amethyst hover:text-brand-foreground transition-colors"
              >
                View Candidates
                <ArrowRight className="ml-0.5" />
              </Button>
              {job.activeCandidateCount > 0 && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-brand-success ring-2 ring-card" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const jobStats = [{ title: "Total Jobs", value: totalJobs, icon: Briefcase }];

  return (
    <main className="px-2 sm:px-4 md:px-6 py-4 space-y-6">
      <SEO title="My Job Posts | Prospectly" />

      {/* Page header + stats */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-brand-gradient sm:text-3xl">
            My Job Posts — track candidates, manage requests.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor active postings and track candidates from a single command
            center.
          </p>
        </div>
        <div className={cn("w-full shrink-0 lg:w-[640px]")}>
          <div className={PAGE_STATS_ROW_END_CLASS}>
            {jobStats.map((stat) => (
              <PageStatCard
                key={stat.title}
                label={stat.title}
                icon={stat.icon}
                value={stat.value}
                className={PAGE_STAT_CARD_LG_WIDTH_CLASS}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as JobPostsTab)}
          className="w-full flex flex-col"
        >
          <PipelineTabs
            tabs={[
              {
                value: "active",
                label: "Active",
                icon: Briefcase,
                badge: activeJobs,
                color: "blue",
              },
              {
                value: "closed",
                label: "Closed",
                icon: Archive,
                badge: closedJobs,
                color: "emerald",
              },
            ]}
            activeTab={activeTab}
            onTabChange={(v) => setActiveTab(v as JobPostsTab)}
            isRefreshing={isRefreshing || isFetching}
            onRefresh={handleRefresh}
            showSearch
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Search jobs…"
            searchSuffix={
              <CountryFilterMultiSelect
                value={selectedCountries}
                onChange={setSelectedCountries}
              />
            }
            actions={
              <Button
                onClick={attemptPostJobNavigation}
                disabled={calendarGuardLoading}
                size="default"
                className="shrink-0 bg-brand-gradient text-brand-foreground font-semibold shadow-brand-cta transition-all hover:shadow-brand-cta-lg hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4 mr-2" />
                Post New Job
              </Button>
            }
            containerMinWidth="min-w-[550px]"
            tabsListMinWidth="min-w-[280px]"
            tabsListMaxWidth="max-w-sm"
          />
        </Tabs>

        {/* Job List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[260px] rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <Card className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-destructive/10 text-brand-destructive">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Something went wrong</h3>
            <p className="text-muted-foreground mb-6">
              Failed to load your job postings. Please try again.
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </Card>
        ) : jobs.length === 0 ? (
          <Card className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
              <Briefcase className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Jobs Found</h3>
            <p className="text-muted-foreground mb-6">
              {searchInput || selectedCountries.length
                ? "No jobs match your search criteria."
                : "You haven't posted any jobs yet. Create your first job posting to start finding candidates."}
            </p>
            <Button
              onClick={attemptPostJobNavigation}
              disabled={calendarGuardLoading}
              className="bg-brand-gradient text-brand-foreground font-semibold shadow-brand-cta transition-all hover:shadow-brand-cta-lg hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4 mr-2" />
              Post New Job
            </Button>
          </Card>
        ) : (
          <>
            {/* Showing count */}
            <p className="text-sm text-muted-foreground mb-4">
              Showing {jobs.length} of {filteredTotalJobs} jobs
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />

            {/* Loading next page */}
            {isFetchingNextPage && <LoadMoreLoader className="py-8" />}

            {/* End of list */}
            {!hasNextPage && jobs.length > 0 && (
              <p className="text-center text-sm italic text-muted-foreground py-8">
                You've reached the end
              </p>
            )}
          </>
        )}
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}

      {/* Close Job Dialog */}
      <Dialog
        open={!!closeJobTarget}
        onOpenChange={(open) => {
          if (isClosing) return;
          if (!open) resetCloseDialog();
        }}
      >
        <DialogContent
          className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          mobileFullscreen
          hideCloseButton
        >
          {/* Hero */}
          <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-6 text-white sm:p-7">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
            />
            <DialogClose
              disabled={isClosing}
              className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
            <div className="relative flex items-center gap-3.5 pr-10">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
                  Close Job Post
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="mt-1 text-[13px] leading-relaxed text-white/90">
                    Closing{" "}
                    <span className="font-semibold text-white">
                      {closeJobTarget?.title}
                    </span>{" "}
                    will remove it from open jobs and stop new applications.
                  </div>
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto thin-scroll p-5 sm:p-6">
              <div className="rounded-lg border border-brand-warning/30 bg-brand-warning/10 p-3 text-sm text-brand-warning">
                <p>
                  New candidates will no longer be able to apply. You can reopen
                  this job later if needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="close-reason" className="flex items-center">
                  Reason for closing{" "}
                  <span className="text-brand-destructive">*</span>
                  <span className="text-xs font-normal text-muted-foreground pl-1">
                    (Minimum 50 characters required)
                  </span>
                </Label>
                <Textarea
                  id="close-reason"
                  placeholder="e.g. Position filled, budget changes, role no longer needed..."
                  value={closeReason}
                  onChange={(e) => {
                    setCloseReason(e.target.value);
                    if (closeReasonError) setCloseReasonError(null);
                  }}
                  maxLength={500}
                  rows={3}
                  disabled={isClosing}
                  aria-describedby={
                    closeReasonError ? "close-reason-error" : undefined
                  }
                  aria-invalid={!!closeReasonError}
                  className={cn(
                    closeReasonError &&
                      "border-brand-destructive focus-visible:ring-brand-destructive"
                  )}
                />
                {closeReasonError ? (
                  <p
                    id="close-reason-error"
                    role="alert"
                    className="text-xs text-brand-destructive"
                  >
                    {closeReasonError}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground text-right">
                  {closeReason.length}/500
                </p>
              </div>

              <JobLifecycleNotificationFields
                checkboxId="close-send-notifications"
                sendNotifications={sendCloseNotifications}
                onSendNotificationsChange={setSendCloseNotifications}
                notifyStages={closeNotifyStages}
                onNotifyStagesChange={setCloseNotifyStages}
                disabled={isClosing}
                enabledDescription="All connectors linked to this job will be notified. Select stages below to also email candidates in those pipeline stages."
                disabledDescription="When enabled, all connectors linked to this job will be notified."
              />
            </div>

            <div className="flex shrink-0 gap-2 border-t border-border bg-card p-4 sm:justify-end">
              <Button
                variant="outline"
                onClick={resetCloseDialog}
                disabled={isClosing}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                disabled={isClosing}
                className="flex-1 bg-brand-destructive font-semibold text-brand-foreground transition-colors hover:bg-brand-destructive/90 sm:flex-none"
                onClick={async () => {
                  if (!closeJobTarget) return;

                  const trimmedReason = closeReason.trim();
                  if (trimmedReason.length < 50) {
                    setCloseReasonError(
                      trimmedReason.length === 0
                        ? "Reason for closing is required (minimum 50 characters)."
                        : `Reason must be at least 50 characters (${trimmedReason.length}/50).`
                    );
                    return;
                  }

                  setCloseReasonError(null);

                  try {
                    await closeJobMutation.mutateAsync({
                      jobId: closeJobTarget.id,
                      payload: {
                        reason: trimmedReason,
                        sendNotifications: sendCloseNotifications,
                        candidateStageKeys: sendCloseNotifications
                          ? normalizeJobCloseStageKeysForApi(closeNotifyStages)
                          : undefined,
                      },
                    });
                    toast({
                      title: "Job closed",
                      description: sendCloseNotifications
                        ? `${closeJobTarget.title} has been closed. Email notifications are being sent.`
                        : `${closeJobTarget.title} has been closed.`,
                    });
                    resetCloseDialog();
                    setActiveTab("closed");
                  } catch {
                    toast({
                      title: "Failed to close job",
                      description: "Something went wrong. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                {isClosing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Closing...
                  </>
                ) : (
                  "Close Job Post"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!reopenJobTarget}
        onOpenChange={(open) => {
          if (isReopening) return;
          if (!open) resetReopenDialog();
        }}
      >
        <DialogContent
          className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          mobileFullscreen
          hideCloseButton
        >
          <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-6 text-white sm:p-7">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
            />
            <DialogClose
              disabled={isReopening}
              className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
            <div className="relative flex items-center gap-3.5 pr-10">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
                  Reopen Job Post
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="mt-1 text-[13px] leading-relaxed !text-white/90">
                    Reopening{" "}
                    <span className="font-semibold text-white">
                      {reopenJobTarget?.title}
                    </span>{" "}
                    will make it active again and visible in open jobs.
                  </div>
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto thin-scroll p-5 sm:p-6">
              <p className="text-sm text-muted-foreground">
                Once reopened, this job will show in Active jobs again and you
                can continue managing candidates as usual.
              </p>

              <JobLifecycleNotificationFields
                checkboxId="reopen-send-notifications"
                sendNotifications={sendReopenNotifications}
                onSendNotificationsChange={setSendReopenNotifications}
                notifyStages={reopenNotifyStages}
                onNotifyStagesChange={setReopenNotifyStages}
                disabled={isReopening}
                enabledDescription="All connectors linked to this job will be notified. Select stages below to also email candidates in those pipeline stages."
                disabledDescription="When enabled, all connectors linked to this job will be notified."
              />
            </div>

            <div className="flex shrink-0 gap-2 border-t border-border bg-card p-4 sm:justify-end">
              <Button
                variant="outline"
                onClick={resetReopenDialog}
                disabled={isReopening}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                disabled={isReopening}
                className="flex-1 bg-brand-gradient font-semibold text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg sm:flex-none"
                onClick={async () => {
                  if (!reopenJobTarget) return;
                  try {
                    await reopenJobMutation.mutateAsync({
                      jobId: reopenJobTarget.id,
                      payload: {
                        sendNotifications: sendReopenNotifications,
                        candidateStageKeys: sendReopenNotifications
                          ? normalizeJobCloseStageKeysForApi(reopenNotifyStages)
                          : undefined,
                      },
                    });
                    toast({
                      title: "Job reopened",
                      description: sendReopenNotifications
                        ? `${reopenJobTarget.title} is active again. Email notifications are being sent.`
                        : `${reopenJobTarget.title} is active again.`,
                    });
                    resetReopenDialog();
                    setActiveTab("active");
                  } catch {
                    // Error toast handled in useReopenRecruitmentJob onError
                  }
                }}
              >
                {isReopening ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reopening...
                  </>
                ) : (
                  "Reopen Job Post"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Notification Modal */}
      <SendNotificationModal
        job={notifyJobTarget}
        open={!!notifyJobTarget}
        onOpenChange={(open) => {
          if (!open) setNotifyJobTarget(null);
        }}
      />

      {/* Manage Collaborators Modal */}
      <ManageCollaboratorsModal
        jobId={manageCollabTarget?.id ?? null}
        jobTitle={manageCollabTarget?.title}
        open={!!manageCollabTarget}
        onOpenChange={(open) => {
          if (!open) setManageCollabTarget(null);
        }}
      />

      <PostJobCalendarConnectModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </main>
  );
}
