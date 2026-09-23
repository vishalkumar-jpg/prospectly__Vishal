import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Users,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  FileText,
  Share2,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRouteSearch } from "@/hooks/useRouteSearch";
import { useMatchScoreRangesFromUrl } from "@/hooks/useMatchScoreRangesFromUrl";
import { usePipelineFilterConfig } from "@/hooks/usePipelineFilterConfig";
import { useJobCandidatesPipeline } from "@/hooks/useJobCandidatesPipeline";
import { useJobResumeSearch } from "@/hooks/useJobResumeSearch";
import { ResumeSemanticSearchInput } from "@/components/recruitment/ResumeSemanticSearchInput";
import { ResumeSearchNotices } from "@/components/recruitment/ResumeSearchNotices";
import { ResumeSearchEmptyState } from "@/components/recruitment/ResumeSearchEmptyState";
import { PipelineFilterSheet } from "@/components/recruitment/PipelineFilterSheet";
import {
  matchCandidatesByName,
  type NameSearchCandidate,
} from "@/lib/recruitment/candidate-name-search.utils";
import { RESUME_SEARCH_URL_PARAM } from "@/lib/recruitment/resume-search.utils";
import { useSendConsent, useResendConsent } from "@/hooks/useConsent";
import { ChangeConsentEmailDialog } from "@/components/recruitment/ChangeConsentEmailDialog";
import { ConnectorReplaceResumeModal } from "@/components/recruitment/ConnectorReplaceResumeModal";
import type { ReplaceResumeTarget } from "@/lib/recruitment/connector-replace-resume.utils";
import { useDeclineJobPoolMatch } from "@/hooks/useJobPoolMatches";
import JobDetailsDrawer from "@/components/recruitment/JobDetailsDrawer";
import { ConnectorJobActionButtons } from "@/components/recruitment/ConnectorJobActionButtons";
import { formatShareJobLabel } from "@/lib/recruitment/connector-job-action-labels";
import { useConnectorReferShareModals } from "@/hooks/useConnectorReferShareModals";
import {
  formatSalaryPeriod,
  formatSalaryRange,
  isValidSalaryRange,
} from "@/utils/formatter";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";
import { InboxJobCandidateItem } from "./connector-pipeline/InboxTab";
import ConnectorKanbanCard from "./connector-pipeline/ConnectorKanbanCard";
import {
  JOB_BOARD_COLUMNS,
  JOB_BOARD_POOL_COLUMNS,
  CONNECTOR_STAGE_COLORS,
  type ConnectorStage,
  type ConnectorCandidate,
  type InboxItem,
  type InboxCandidate,
} from "./connector-pipeline/types";
import { isBoardColumnVisible } from "./connector-pipeline/job-board-filter.utils";
import { candidateMatchesScoreRanges } from "@/lib/recruitment/match-score-range-filter.utils";

const PIPELINE_OUTLINE_BTN =
  "h-9 shrink-0 gap-2 px-4 font-semibold border-border bg-card text-brand-amethyst transition-all duration-200 hover:border-brand-amethyst/30 hover:bg-brand-amethyst/10 hover:text-brand-amethyst";

const JOB_BOARD_STAGE_IDS = new Set<ConnectorStage>(
  JOB_BOARD_COLUMNS.map((col) => col.id)
);

function toBoardFilterStages(stages: string[]): ConnectorStage[] {
  return stages.filter((stage): stage is ConnectorStage =>
    JOB_BOARD_STAGE_IDS.has(stage as ConnectorStage)
  );
}

const POOL_COLUMN_SET = new Set<ConnectorStage>(JOB_BOARD_POOL_COLUMNS);
const READ_ONLY_COLUMNS = new Set<ConnectorStage>([
  "not_qualified",
  "connector_declined",
]);

function poolColumnFor(
  item: InboxItem,
  shouldHideQualifiedFlash?: (item: InboxItem) => boolean
): ConnectorStage {
  if (item.type === "upload_job") return "ai_analysis";
  // Connector resume-upload auto-consent: keep card in AI Analysis while BE
  // still goes pending → consent_pending (no Qualified flash on the board).
  if (shouldHideQualifiedFlash?.(item)) return "ai_analysis";
  switch (item.status) {
    case "processing":
    case "failed":
      return "ai_analysis";
    case "consent_pending":
    case "consent_superseded":
      return "consent_pending";
    case "consent_declined":
      return "consent_declined";
    case "connector_declined":
      return "connector_declined";
    default:
      return item.matchScore >= 50 ? "qualified" : "not_qualified";
  }
}

function poolScore(item: InboxItem): number {
  return item.type === "upload_job"
    ? Number.POSITIVE_INFINITY
    : item.matchScore;
}

function itemKey(item: InboxItem): string {
  return item.type === "upload_job" ? item.uploadJobId : item.matchId;
}

export default function JobCandidatesPipeline() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    search: resumeQuery,
    setSearch: setResumeQuery,
    clearSearch: clearResumeQuery,
  } = useRouteSearch({ paramName: RESUME_SEARCH_URL_PARAM });
  const {
    myPipelineFilterStages,
    savePipelineFilter,
    isLoading: configLoading,
  } = usePipelineFilterConfig();
  const hasInitializedFilter = useRef(false);

  const {
    jobTitle,
    jobCompany,
    jobLocation,
    bountyAmount,
    jobSalaryRangeMin,
    jobSalaryRangeMax,
    jobSalaryCurrency,
    jobSalaryPeriod,
    myReferCount,
    hasSharedLink,
    connectorPayout,
    sharerPayout,
    poolItems,
    referred,
    loading,
    error,
    refetch,
    shouldHideQualifiedFlash,
  } = useJobCandidatesPipeline(jobId);

  const sendConsentMutation = useSendConsent();
  const resendConsentMutation = useResendConsent();
  const declineMatchMutation = useDeclineJobPoolMatch();

  const [consentConfirm, setConsentConfirm] = useState<InboxCandidate | null>(
    null
  );
  const [resendConfirm, setResendConfirm] = useState<InboxCandidate | null>(
    null
  );
  const [changeEmailCandidate, setChangeEmailCandidate] =
    useState<InboxCandidate | null>(null);
  const [replaceResumeTarget, setReplaceResumeTarget] =
    useState<ReplaceResumeTarget | null>(null);
  const [declineConfirm, setDeclineConfirm] = useState<InboxCandidate | null>(
    null
  );
  const [declineReason, setDeclineReason] = useState("");
  const [approvingMatchId, setApprovingMatchId] = useState<string | null>(null);
  const [resendingMatchId, setResendingMatchId] = useState<string | null>(null);
  const [decliningMatchId, setDecliningMatchId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const { handleRefer, handleShare, modals } = useConnectorReferShareModals({
    onAfterReferSuccess: () => refetch(),
    onAfterShareSuccess: () => refetch(),
  });
  const jobActionsReady = Boolean(jobId && !loading && jobTitle && jobCompany);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStages, setSelectedStages] = useState<ConnectorStage[]>([]);
  const { matchScoreRanges, setMatchScoreRanges } =
    useMatchScoreRangesFromUrl();

  useEffect(() => {
    if (!configLoading && !hasInitializedFilter.current) {
      setSelectedStages(toBoardFilterStages(myPipelineFilterStages));
      hasInitializedFilter.current = true;
    }
  }, [configLoading, myPipelineFilterStages]);

  /**
   * Both halves of the board in one list for name matching. Pool matches are
   * keyed on their match id and referred rows on the candidate id — the two id
   * spaces the connector-scoped search returns.
   */
  const nameSearchRows = useMemo<NameSearchCandidate[]>(
    () => [
      ...poolItems
        .filter((item): item is InboxCandidate => item.type !== "upload_job")
        .map((item) => ({
          id: item.matchId,
          revealedName: item.candidateName,
        })),
      ...(referred as ConnectorCandidate[]).map((c) => ({
        id: c.id,
        revealedName: c.candidateName,
      })),
    ],
    [poolItems, referred]
  );

  // Nothing is anonymised here — the connector sourced these people — so a name
  // always matches against the name on the card. The residual is what reaches
  // the resume search: a surname left in reads to the query planner as a hard
  // skill requirement that no resume satisfies.
  const nameSearch = useMemo(
    () => matchCandidatesByName(resumeQuery, nameSearchRows),
    [resumeQuery, nameSearchRows]
  );
  const resumeSearch = useJobResumeSearch(
    jobId,
    nameSearch.residual,
    "connector"
  );

  const resumeFilterActive = resumeSearch.isActive && !resumeSearch.error;
  const resumeMatchById = resumeSearch.matchById;
  const nameMatchIds = nameSearch.candidateIds;
  const nameFilterActive = nameMatchIds.size > 0;
  const boardSearchActive = nameFilterActive || resumeFilterActive;

  /**
   * Membership only. A named person is who the connector asked for, so the name
   * decides who appears; the rest of the query still ran and supplies the chips
   * and the order.
   */
  const passesSearch = useCallback(
    (id: string) => {
      if (nameFilterActive) return nameMatchIds.has(id);
      if (resumeFilterActive) return resumeMatchById.has(id);
      return true;
    },
    [nameFilterActive, nameMatchIds, resumeFilterActive, resumeMatchById]
  );

  const resumeRankOf = useCallback(
    (id: string) => resumeMatchById.get(id)?.rank ?? Number.POSITIVE_INFINITY,
    [resumeMatchById]
  );

  const referredMatchIds = useMemo(() => {
    const ids = new Set<string>();
    for (const candidate of referred as ConnectorCandidate[]) {
      if (candidate.matchId) ids.add(candidate.matchId);
    }
    return ids;
  }, [referred]);

  const poolByColumn = useMemo(() => {
    const map = {} as Record<ConnectorStage, InboxItem[]>;
    JOB_BOARD_POOL_COLUMNS.forEach((id) => (map[id] = []));
    poolItems.forEach((item) => {
      if (item.type === "upload_job") {
        // A queued upload has no parsed resume yet, so it cannot match a search
        // and showing it unfiltered would read as a result.
        if (boardSearchActive) return;
        if (!candidateMatchesScoreRanges(null, matchScoreRanges)) return;
      } else {
        if (referredMatchIds.has(item.matchId)) return;
        if (!passesSearch(item.matchId)) return;
        if (!candidateMatchesScoreRanges(item.matchScore, matchScoreRanges)) {
          return;
        }
      }
      map[poolColumnFor(item, shouldHideQualifiedFlash)].push(item);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) =>
        resumeFilterActive
          ? resumeRankOf(itemKey(a)) - resumeRankOf(itemKey(b))
          : poolScore(b) - poolScore(a)
      )
    );
    return map;
  }, [
    poolItems,
    referredMatchIds,
    matchScoreRanges,
    shouldHideQualifiedFlash,
    boardSearchActive,
    passesSearch,
    resumeFilterActive,
    resumeRankOf,
  ]);

  const referredByStage = useMemo(() => {
    const map: Record<string, ConnectorCandidate[]> = {};
    (referred as ConnectorCandidate[]).forEach((c) => {
      if (!passesSearch(c.id)) return;
      if (!candidateMatchesScoreRanges(c.matchScore, matchScoreRanges)) return;
      (map[c.stage] ??= []).push(c);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) =>
        resumeFilterActive
          ? resumeRankOf(a.id) - resumeRankOf(b.id)
          : (b.matchScore ?? -Infinity) - (a.matchScore ?? -Infinity)
      )
    );
    return map;
  }, [
    referred,
    matchScoreRanges,
    passesSearch,
    resumeFilterActive,
    resumeRankOf,
  ]);

  const columnCount = (id: ConnectorStage) => {
    // Not Qualified / AI Analysis show BOTH pool matches and referred
    // (share-link) candidates — share applies land in AI Analysis while scoring.
    if (id === "not_qualified" || id === "ai_analysis") {
      return (
        (poolByColumn[id]?.length ?? 0) + (referredByStage[id]?.length ?? 0)
      );
    }
    return POOL_COLUMN_SET.has(id)
      ? (poolByColumn[id]?.length ?? 0)
      : (referredByStage[id]?.length ?? 0);
  };

  const visibleColumns = useMemo(
    () =>
      JOB_BOARD_COLUMNS.filter((col) =>
        isBoardColumnVisible(col.id, selectedStages)
      ),
    [selectedStages]
  );

  // What survives every filter AND stage visibility — a hit sitting in a hidden
  // column is a different problem from finding nobody.
  const visibleSearchMatchCount = useMemo(
    () =>
      boardSearchActive
        ? visibleColumns.reduce((total, col) => total + columnCount(col.id), 0)
        : 0,
    // columnCount closes over the two memos, which are the real inputs here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardSearchActive, visibleColumns, poolByColumn, referredByStage]
  );

  const showSearchEmptyState =
    boardSearchActive && !resumeSearch.loading && visibleSearchMatchCount === 0;

  // Counts filter groups, not selections, matching the recruiter board.
  const activeFilterCount =
    (matchScoreRanges.length > 0 ? 1 : 0) + (selectedStages.length > 0 ? 1 : 0);

  const handleSelectedStagesChange = useCallback(
    (next: string[]) => {
      setSelectedStages(next as ConnectorStage[]);
      // The hook's onError already raises the toast; without the catch the
      // rejected mutateAsync also surfaces as an unhandled rejection.
      void savePipelineFilter("my_pipeline", next).catch(() => {});
    },
    [savePipelineFilter]
  );

  const handleClearAllFilters = useCallback(() => {
    setMatchScoreRanges([]);
    handleSelectedStagesChange([]);
  }, [setMatchScoreRanges, handleSelectedStagesChange]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleConfirmSendConsent = async () => {
    if (!consentConfirm) return;
    const candidate = consentConfirm;
    setApprovingMatchId(candidate.matchId);
    setConsentConfirm(null);
    try {
      await sendConsentMutation.mutateAsync(candidate.matchId);
      toast({
        title: "Consent email sent",
        description: `Consent email sent to ${candidate.candidateName}.`,
      });
      refetch();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const message = (err as { message?: string })?.message;
      toast({
        title:
          status === 409 ? "Cannot send consent" : "Failed to send consent",
        description:
          message ||
          (status === 409
            ? "This candidate is already claimed or blocked for this action."
            : "Something went wrong. Please try again."),
        variant: "destructive",
      });
      refetch();
    } finally {
      setApprovingMatchId(null);
    }
  };

  const handleConfirmResendConsent = async () => {
    if (!resendConfirm) return;
    const candidate = resendConfirm;
    setResendingMatchId(candidate.matchId);
    setResendConfirm(null);
    try {
      await resendConsentMutation.mutateAsync(candidate.matchId);
      toast({
        title: "Consent email resent",
        description: `A new consent email was sent to ${candidate.candidateName}.`,
      });
      refetch();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const message = (err as { message?: string })?.message;
      toast({
        title:
          status === 409 ? "Cannot resend consent" : "Failed to resend consent",
        description:
          message ||
          (status === 409
            ? "This candidate already accepted another connector, or blocked you."
            : "Something went wrong. Please try again."),
        variant: "destructive",
      });
      refetch();
    } finally {
      setResendingMatchId(null);
    }
  };

  const handleConfirmDecline = async () => {
    if (!declineConfirm) return;
    const candidate = declineConfirm;
    setDecliningMatchId(candidate.matchId);
    setDeclineConfirm(null);
    try {
      await declineMatchMutation.mutateAsync({
        matchId: candidate.matchId,
        reason: declineReason.trim() || undefined,
      });
      toast({
        title: "Match declined",
        description: `${candidate.candidateName} has been moved to Not Referred.`,
      });
      refetch();
    } catch {
      toast({
        title: "Failed to decline",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDecliningMatchId(null);
      setDeclineReason("");
    }
  };

  const salaryMin = Number(jobSalaryRangeMin) || 0;
  const salaryMax = Number(jobSalaryRangeMax) || 0;
  const payoutAmount = Number(connectorPayout) || 0;

  const totalBoardCandidates = JOB_BOARD_COLUMNS.reduce(
    (sum, col) => sum + columnCount(col.id),
    0
  );

  /** Facts the removed hero banner carried, kept on one muted line. */
  const salaryLabel = isValidSalaryRange(salaryMin, salaryMax)
    ? `${formatSalaryRange(salaryMin, salaryMax, jobSalaryCurrency)}${
        jobSalaryPeriod
          ? ` / ${formatSalaryPeriod(jobSalaryPeriod).toLowerCase()}`
          : ""
      }`
    : null;
  const headerMeta = [
    jobCompany,
    jobLocation,
    salaryLabel,
    `Payout: $${formatMoneyWithCommas(payoutAmount)}`,
  ].filter((part): part is string => Boolean(part));

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <SEO title="Candidates | Prospectly" />

      {/* Header — title + Job Details */}
      <div className="flex-shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[21px] font-extrabold leading-tight tracking-[-0.03em] text-brand-gradient">
              {jobTitle || "Candidates"}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-muted-foreground">
              <span>
                {totalBoardCandidates} candidate
                {totalBoardCandidates === 1 ? "" : "s"}
              </span>
              {headerMeta.map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50"
                  />
                  {item}
                </span>
              ))}
            </p>
          </div>
          {jobId ? (
            <div className="flex shrink-0 items-center gap-2 self-start">
              {jobActionsReady ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleShare({
                      id: jobId,
                      title: jobTitle,
                      companyName: jobCompany,
                      bountyAmount,
                      connectorPayout,
                      sharerPayout,
                    })
                  }
                  className={PIPELINE_OUTLINE_BTN}
                >
                  <Share2 className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">
                    {formatShareJobLabel()}
                  </span>
                  {hasSharedLink ? (
                    <Badge
                      variant="outline"
                      className="ml-0.5 border-brand-success/30 bg-brand-success/10 px-1.5 py-0 text-[10px] font-semibold text-brand-success"
                    >
                      Shared
                    </Badge>
                  ) : null}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowJobDetails(true)}
                className={PIPELINE_OUTLINE_BTN}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Job Details</span>
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Back + Search + Refer/Share + Filter + Refresh */}
      <div className="flex-shrink-0 px-4 pt-4 sm:px-6">
        <div className="flex w-full flex-nowrap items-center gap-3 overflow-x-auto thin-scroll rounded-2xl border border-border bg-card px-3 py-2.5 shadow-sm lg:gap-4 lg:overflow-visible">
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 sm:gap-3 lg:gap-4">
              {/* Back reads as navigation, not another tool: ghost surface, the
                  app's icon-chip idiom, and the arrow slides left on hover. */}
              <Button
                variant="ghost"
                onClick={() => navigate("/recruiting/refer-candidates/inbox")}
                aria-label="Back to Inbox"
                className="group h-10 shrink-0 gap-2 rounded-xl py-0 pl-1.5 pr-3 text-muted-foreground transition-all duration-200 hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] border border-border bg-muted/50 transition-all duration-200 group-hover:-translate-x-0.5 group-hover:border-brand-amethyst/20 group-hover:bg-card group-hover:shadow-sm">
                  <ArrowLeft />
                </span>
                Inbox
              </Button>

              {/* separates navigation from the search/filter tools beside it */}
              <span
                aria-hidden
                className="hidden h-6 w-px shrink-0 bg-border sm:block"
              />
              <ResumeSemanticSearchInput
                value={resumeQuery}
                onSubmit={setResumeQuery}
                onClear={clearResumeQuery}
                isSearching={resumeSearch.loading}
                className="w-64 min-w-[200px] shrink-0 lg:w-auto lg:max-w-[40rem] lg:shrink lg:flex-1 lg:min-w-[16rem]"
              />
          </div>

          <TooltipProvider>
            <div className="flex shrink-0 flex-nowrap items-center gap-2 sm:gap-3 lg:ml-auto">
              {jobActionsReady ? (
                <ConnectorJobActionButtons
                  referCount={myReferCount}
                  hasSharedLink={hasSharedLink}
                  onRefer={() =>
                    handleRefer({
                      id: jobId!,
                      title: jobTitle,
                      companyName: jobCompany,
                      bountyAmount,
                      connectorPayout,
                      sharerPayout,
                    })
                  }
                  layout="pipeline"
                />
              ) : null}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(true)}
                aria-haspopup="dialog"
                aria-expanded={showFilters}
                className={PIPELINE_OUTLINE_BTN}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-0.5 rounded-full border-0 bg-brand-amethyst/10 px-1.5 py-0 text-[11px] font-bold text-brand-amethyst"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={PIPELINE_OUTLINE_BTN}
                    onClick={handleRefresh}
                    disabled={isRefreshing || loading}
                  >
                    <RefreshCw
                      className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                    />
                    <span>Refresh</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reload pipeline data</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>

      <PipelineFilterSheet
        open={showFilters}
        onOpenChange={setShowFilters}
        matchScoreRanges={matchScoreRanges}
        onMatchScoreRangesChange={setMatchScoreRanges}
        stages={JOB_BOARD_COLUMNS.map((col) => ({
          id: col.id,
          label: col.label,
          color: CONNECTOR_STAGE_COLORS[col.id].color,
        }))}
        selectedStages={selectedStages}
        onSelectedStagesChange={handleSelectedStagesChange}
        getStageCount={(stageId) => columnCount(stageId as ConnectorStage)}
        onClearAll={handleClearAllFilters}
      />

      {resumeSearch.isActive && !resumeSearch.loading ? (
        <div className="px-4 sm:px-6">
          <ResumeSearchNotices
            error={resumeSearch.error}
            totalCandidates={resumeSearch.totalCandidates}
            indexedCandidates={resumeSearch.indexedCandidates}
            degraded={resumeSearch.degraded}
            truncated={resumeSearch.truncated}
            plannerUnavailable={resumeSearch.plannerUnavailable}
            unknownExperienceCount={resumeSearch.unknownExperienceCount}
            nameFiltered={nameFilterActive}
            onRetry={() => void resumeSearch.refetch()}
            onClear={clearResumeQuery}
          />
        </div>
      ) : null}

      {/* Kanban Board — only this area scrolls horizontally */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
        {showSearchEmptyState && !loading ? (
          <div className="h-full px-4 py-6 sm:px-6">
            {/* The connector's own words, not the residual the server echoes. */}
            <ResumeSearchEmptyState
              query={resumeQuery}
              matchedButFiltered={nameFilterActive}
              anonymised={false}
              onClear={clearResumeQuery}
            />
          </div>
        ) : loading ? (
          <div className="flex h-full gap-4 px-4 py-6 sm:px-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex h-full w-[340px] flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm"
              >
                <Skeleton className="h-12 w-full rounded-none" />
                <div className="flex-1 space-y-3 bg-app p-2">
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-32 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
            <h3 className="mb-1 text-lg font-semibold text-slate-700">
              Couldn't load candidates
            </h3>
            <p className="mb-4 text-slate-500">Please try again.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : (
          <div
            className="flex h-full gap-4 px-4 py-6 sm:px-6"
            style={{ minWidth: "fit-content" }}
          >
            {visibleColumns.map((col) => {
              const colors = CONNECTOR_STAGE_COLORS[col.id];
              const isPool = POOL_COLUMN_SET.has(col.id);
              const readOnly = READ_ONLY_COLUMNS.has(col.id);
              const count = columnCount(col.id);

              return (
                <div
                  key={col.id}
                  className="flex-shrink-0 w-[340px] flex flex-col bg-white border border-slate-200/70 rounded-2xl shadow-sm overflow-hidden"
                  style={{ maxHeight: "100%" }}
                >
                  <div
                    className={cn(
                      "px-4 py-3.5 flex-shrink-0 bg-white border-b-2",
                      colors.headBorder
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "h-[9px] w-[9px] rounded-full ring-[3px]",
                            colors.color,
                            colors.dotRing
                          )}
                        />
                        <h3 className="font-bold text-sm text-slate-800">
                          {col.label}
                        </h3>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold rounded-full px-2.5 py-0.5 min-w-[26px] text-center",
                          colors.countBg,
                          colors.countText
                        )}
                      >
                        {count}
                      </span>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 min-h-0 p-2 bg-app">
                    <div className="space-y-3 p-1">
                      {count === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                          <Users className="mb-2 h-7 w-7 opacity-40" />
                          <span className="text-sm font-medium">
                            No candidates
                          </span>
                        </div>
                      ) : isPool ? (
                        <>
                          {poolByColumn[col.id].map((item) => (
                            <InboxJobCandidateItem
                              key={itemKey(item)}
                              item={item}
                              jobTitle={jobTitle}
                              jobCompany={jobCompany}
                              stage={col.id}
                              stageLabel={col.label}
                              onApprove={(c) => setConsentConfirm(c)}
                              onResendConsent={(c) => setResendConfirm(c)}
                              onChangeConsentEmail={(c) =>
                                setChangeEmailCandidate(c)
                              }
                              onReplaceResume={setReplaceResumeTarget}
                              onDecline={(c) => {
                                setDeclineConfirm(c);
                                setDeclineReason("");
                              }}
                              approvingMatchId={approvingMatchId}
                              resendingMatchId={resendingMatchId}
                              decliningMatchId={decliningMatchId}
                              readOnly={readOnly}
                              relevance={resumeMatchById.get(itemKey(item))}
                              relevanceTopScore={resumeSearch.topScore}
                            />
                          ))}
                          {(col.id === "not_qualified" ||
                            col.id === "ai_analysis") &&
                            (referredByStage[col.id] ?? []).map((candidate) => (
                              <ConnectorKanbanCard
                                key={candidate.id}
                                candidate={candidate}
                                stageLabel={col.label}
                                onReplaceResume={setReplaceResumeTarget}
                                relevance={resumeMatchById.get(candidate.id)}
                                relevanceTopScore={resumeSearch.topScore}
                              />
                            ))}
                        </>
                      ) : (
                        (referredByStage[col.id] ?? []).map((candidate) => (
                          <ConnectorKanbanCard
                            key={candidate.id}
                            candidate={candidate}
                            stageLabel={col.label}
                            onReplaceResume={setReplaceResumeTarget}
                            relevance={resumeMatchById.get(candidate.id)}
                            relevanceTopScore={resumeSearch.topScore}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <JobDetailsDrawer
        jobId={jobId ?? null}
        open={showJobDetails}
        onOpenChange={setShowJobDetails}
        referCount={myReferCount}
        hasSharedLink={hasSharedLink}
        onReferCandidate={
          jobActionsReady
            ? () =>
                handleRefer({
                  id: jobId!,
                  title: jobTitle,
                  companyName: jobCompany,
                  bountyAmount,
                  connectorPayout,
                  sharerPayout,
                })
            : undefined
        }
        onShareJob={
          jobActionsReady
            ? () =>
                handleShare({
                  id: jobId!,
                  title: jobTitle,
                  companyName: jobCompany,
                  bountyAmount,
                  connectorPayout,
                  sharerPayout,
                })
            : undefined
        }
      />

      {modals}

      <AlertDialog
        open={!!consentConfirm}
        onOpenChange={(open) => !open && setConsentConfirm(null)}
      >
        <AlertDialogContent mobileFullscreen>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Consent Email</AlertDialogTitle>
            <AlertDialogDescription>
              {consentConfirm
                ? `Send a consent email to ${consentConfirm.candidateName}? They will be able to review the job details and accept or decline.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSendConsent}
              className={buttonVariants({ variant: "brand" })}
            >
              Send Consent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!resendConfirm}
        onOpenChange={(open) => !open && setResendConfirm(null)}
      >
        <AlertDialogContent mobileFullscreen>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend Consent Email</AlertDialogTitle>
            <AlertDialogDescription>
              {resendConfirm
                ? `Resend a consent email to ${resendConfirm.candidateName}? The link in the previous email will stop working.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmResendConsent}
              className={buttonVariants({ variant: "brand" })}
            >
              Resend Consent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ChangeConsentEmailDialog
        open={!!changeEmailCandidate}
        onOpenChange={(open) => !open && setChangeEmailCandidate(null)}
        matchId={changeEmailCandidate?.matchId ?? null}
        candidateName={changeEmailCandidate?.candidateName ?? "Candidate"}
        onSuccess={() => {
          refetch();
        }}
      />

      <ConnectorReplaceResumeModal
        target={replaceResumeTarget}
        onOpenChange={(open) => {
          if (!open) setReplaceResumeTarget(null);
        }}
      />

      <AlertDialog
        open={!!declineConfirm}
        onOpenChange={(open) => {
          if (!open) {
            setDeclineConfirm(null);
            setDeclineReason("");
          }
        }}
      >
        <AlertDialogContent mobileFullscreen>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Don't refer this candidate?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {declineConfirm
                    ? `You're declining ${declineConfirm.candidateName}. They'll move to "Not Referred".`
                    : ""}
                </p>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p>This action cannot be undone.</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="decline-reason" className="flex items-center">
              Reason for declining <span className="text-red-500">*</span>
              <span className="pl-1 text-xs font-normal text-muted-foreground">
                (Minimum 50 characters required)
              </span>
            </Label>
            <Textarea
              id="decline-reason"
              placeholder="e.g. Experience doesn't match, salary expectations too high..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              maxLength={500}
              rows={3}
              className="resize-none"
            />
            <p className="text-right text-xs text-muted-foreground">
              {declineReason.length}/500
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDecline}
              className="bg-red-600 hover:bg-red-700"
              disabled={declineReason.trim().length < 50}
            >
              Don't Refer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
