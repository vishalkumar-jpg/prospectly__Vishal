import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  useNavigate,
  useParams,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { useRouteSearch } from "@/hooks/useRouteSearch";
import { useMatchScoreRangesFromUrl } from "@/hooks/useMatchScoreRangesFromUrl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResumeSemanticSearchInput } from "@/components/recruitment/ResumeSemanticSearchInput";
import { ResumeSearchNotices } from "@/components/recruitment/ResumeSearchNotices";
import { ResumeSearchEmptyState } from "@/components/recruitment/ResumeSearchEmptyState";
import { useJobResumeSearch } from "@/hooks/useJobResumeSearch";
import {
  RESUME_SEARCH_URL_PARAM,
  byResumeRank,
} from "@/lib/recruitment/resume-search.utils";
import { matchCandidatesByName } from "@/lib/recruitment/candidate-name-search.utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { utcDayjs } from "@/lib/dayjs";
import { isHttpOrHttpsUrl, isPdfFile } from "@/lib/url-utils";
import {
  ArrowLeft,
  Shield,
  FileText,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatSalaryPeriod,
  formatSalaryRange,
  isValidSalaryRange,
} from "@/utils/formatter";
import { useToast } from "@/hooks/use-toast";
import { SendInterviewInviteRecruiterDialog } from "@/components/recruitment/SendInterviewInviteRecruiterDialog";
import {
  InterviewCalendarConnectModal,
  type InterviewCalendarConnectAction,
} from "@/components/recruitment/InterviewCalendarConnectModal";
import { useCalendarRequirement } from "@/hooks/useCalendarRequirement";
import {
  consumeInterviewInviteResume,
  setInterviewInviteResume,
  clearInterviewInviteResume,
} from "@/utils/interview-invite-resume";
import CandidateDetailModal from "@/components/recruitment/CandidateDetailModal";
import { useRecruitmentJob } from "@/hooks/useRecruitmentJobs";
import { useJobCandidates } from "@/hooks/useJobCandidates";
import { useRejectCandidate } from "@/hooks/useRejectCandidate";
import { useReinstateCandidate } from "@/hooks/useReinstateCandidate";
import { useShortlistCandidate } from "@/hooks/useShortlistCandidate";
import { useMarkInterviewOutcome } from "@/hooks/useMarkInterviewOutcome";
import { useCandidateDetail } from "@/hooks/useCandidateDetail";
import { useCandidateResumeUrl } from "@/hooks/useCandidateResumeUrl";
import {
  recruitmentApi,
  type JobCandidateItem,
  type PayoutScope,
} from "@/lib/api/recruitment";
import {
  PAYOUT_DEEP_LINK_PARAM,
  PAYOUT_SCOPE_PARAM,
} from "./recruiter-dashboard/components/PayoutsDueSection";
import {
  hasPermission,
  RECRUITMENT_PERMISSIONS,
} from "@/lib/recruitment-permissions";
import { TAB_ROUTE_BASES } from "@/lib/tab-routes";
import { useQueryClient } from "@tanstack/react-query";

import {
  PIPELINE_STAGES,
  STAGE_COLORS,
  type RecruiterStage,
  type KanbanCandidate,
} from "./job-kanban/types";
import { useRecruitmentStages } from "@/hooks/useRecruitmentMasterData";
import { usePipelineFilterConfig } from "@/hooks/usePipelineFilterConfig";
import KanbanCandidateCard from "./job-kanban/KanbanCandidateCard";
import ShortlistConfirmDialog from "./job-kanban/ShortlistConfirmDialog";
import HireCandidateDialog from "./job-kanban/HireCandidateDialog";
import ReleasePayoutDialog from "./job-kanban/ReleasePayoutDialog";
import EditClassificationDialog from "./job-kanban/EditClassificationDialog";
import InterviewOutcomeDialog from "@/components/recruitment/InterviewOutcomeDialog";
import RejectDialog from "./job-kanban/RejectDialog";
import ReinstateDialog from "./job-kanban/ReinstateDialog";
import { PipelineFilterSheet } from "@/components/recruitment/PipelineFilterSheet";
import { candidateMatchesScoreRanges } from "@/lib/recruitment/match-score-range-filter.utils";

/** Stage keys that render as recruiter kanban columns, in board order. */
const ACTIVE_KANBAN_STAGES = [
  "not_qualified",
  "in_review",
  "shortlisted",
  "interview_invite_sent",
  "interview_scheduled",
  "interview_completed",
  "hired",
  "rejected",
];

/** Payout deep link: let the board scroll to the card before the dialog covers it. */
const PAYOUT_DEEP_LINK_OPEN_DELAY_MS = 700;
const PAYOUT_DEEP_LINK_HIGHLIGHT_MS = 3000;

function mapApiCandidateToKanban(
  c: JobCandidateItem,
  index: number
): KanbanCandidate {
  const colors = [
    "bg-teal-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-amber-500",
    "bg-pink-500",
    "bg-indigo-500",
  ];
  const exp = c.totalYearsExp;
  const experienceYears =
    exp != null && Number.isFinite(exp) ? Math.max(0, Math.floor(exp)) : null;
  const skills = Array.isArray(c.skills) ? c.skills.slice(0, 20) : [];

  return {
    id: c.id,
    anonymousId: c.anonymousLabel || `Candidate #${index + 1}`,
    avatarColor: colors[index % colors.length],
    currentTitle: c.currentTitle,
    currentCompany: c.currentCompany,
    experienceYears,
    skills,
    matchScore:
      c.matchScore != null && Number.isFinite(c.matchScore)
        ? Math.round(c.matchScore)
        : null,
    stage: (c.stage || "in_review") as RecruiterStage,
    stageUpdatedAt: c.stageUpdatedAt || c.createdAt,
    connectorAnonymousId: c.sharerCode || "",
    revealedName: c.revealedName ?? undefined,
    revealedEmail: c.revealedEmail ?? undefined,
    revealedLinkedIn: c.revealedLinkedIn ?? undefined,
    notQualifiedReason: c.notQualifiedReason ?? undefined,
    meetingDate: c.interview?.scheduledAt ?? undefined,
    interviewOutcome: c.interviewOutcome ?? undefined,
    hasPendingConnectorPayouts: c.hasPendingConnectorPayouts,
    hasPendingCandidatePayout: c.hasPendingCandidatePayout,
    candidatePayoutOnboardingPending: c.candidatePayoutOnboardingPending,
    hasConnectorPayout: c.hasConnectorPayout,
    hasCandidatePayout: c.hasCandidatePayout,
    hasFailedConnectorPayout: c.hasFailedConnectorPayout,
    hasFailedCandidatePayout: c.hasFailedCandidatePayout,
    hasManualReviewConnectorPayout: c.hasManualReviewConnectorPayout,
    hasManualReviewCandidatePayout: c.hasManualReviewCandidatePayout,
    canReinstate: c.canReinstate === true,
  };
}

export default function JobDetailWithKanban() {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { hasCalendar, loading: calendarLoading } = useCalendarRequirement();
  const { stages: apiStages, loading: stagesLoading } = useRecruitmentStages();
  const { job: jobData, loading: jobLoading } = useRecruitmentJob(jobId, {
    view: "pipeline",
  });
  const canReject = useMemo(
    () =>
      hasPermission(
        jobData?.permissions,
        RECRUITMENT_PERMISSIONS.CANDIDATE_REJECT
      ),
    [jobData?.permissions]
  );
  const { candidates: apiCandidates, loading: candidatesLoading } =
    useJobCandidates(jobId);
  const rejectMutation = useRejectCandidate();
  const reinstateMutation = useReinstateCandidate();
  const shortlistMutation = useShortlistCandidate();
  const outcomeMutation = useMarkInterviewOutcome();
  const [searchParams, setSearchParams] = useSearchParams();
  const processedDeepLinkRef = useRef<{
    jobId: string;
    candidateId: string;
  } | null>(null);
  const {
    search: resumeQuery,
    setSearch: setResumeQuery,
    clearSearch: clearResumeQuery,
  } = useRouteSearch({ paramName: RESUME_SEARCH_URL_PARAM });
  const [selectedCandidate, setSelectedCandidate] =
    useState<KanbanCandidate | null>(null);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const { candidate: candidateDetail, loading: candidateDetailLoading } =
    useCandidateDetail(showCandidateModal ? selectedCandidate?.id : undefined);
  // Presigned resume URL is fetched lazily — only when the user clicks Preview or
  // Open (never on modal open), so we don't mint URLs the recruiter never views.
  const {
    resumeUrl,
    loading: resumeLoading,
    fetchResumeUrl,
  } = useCandidateResumeUrl(selectedCandidate?.id);
  const [showResumePreview, setShowResumePreview] = useState(false);

  const handlePreviewResume = () => {
    setShowResumePreview(true);
    if (!resumeUrl) void fetchResumeUrl();
  };

  // Open the resume in a new tab. The blank window is opened synchronously in the
  // click handler (so it isn't popup-blocked) and redirected once the short-lived
  // URL resolves; a cached URL opens directly.
  const handleOpenResume = () => {
    if (resumeUrl) {
      window.open(resumeUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const win = window.open("", "_blank");
    void fetchResumeUrl().then((url) => {
      if (!win) return;
      if (url) win.location.href = url;
      else win.close();
    });
  };

  const {
    recruiterPipelineFilterStages,
    savePipelineFilter,
    isLoading: configLoading,
  } = usePipelineFilterConfig();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { matchScoreRanges, setMatchScoreRanges } =
    useMatchScoreRangesFromUrl();
  const [selectedStages, setSelectedStages] = useState<string[] | null>(null);
  // A payout deep link shows the Hired column for this visit even when the saved
  // stage filter hides it — never persisted to the recruiter's filter config.
  const [forceShowHiredStage, setForceShowHiredStage] = useState(false);
  const [payoutFilterExemptCandidateId, setPayoutFilterExemptCandidateId] =
    useState<string | null>(null);
  const [payoutDeepLink, setPayoutDeepLink] = useState<{
    candidate: KanbanCandidate;
    scope: PayoutScope;
  } | null>(null);
  const processedPayoutDeepLinkRef = useRef<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const hasInitializedFilter = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!configLoading && !hasInitializedFilter.current) {
      setSelectedStages(recruiterPipelineFilterStages);
      hasInitializedFilter.current = true;
    }
  }, [configLoading, recruiterPipelineFilterStages]);

  useEffect(() => {
    const candidateId = searchParams.get("candidate");
    if (!candidateId || !jobId || candidatesLoading || !apiCandidates?.length) {
      return;
    }

    if (
      processedDeepLinkRef.current?.jobId === jobId &&
      processedDeepLinkRef.current?.candidateId === candidateId
    ) {
      return;
    }

    const match = apiCandidates.find((c) => c.id === candidateId);
    if (!match) return;

    processedDeepLinkRef.current = { jobId, candidateId };
    setSelectedCandidate(mapApiCandidateToKanban(match, 0));
    setShowCandidateModal(true);

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("candidate");
        return next;
      },
      { replace: true }
    );
  }, [apiCandidates, candidatesLoading, jobId, searchParams, setSearchParams]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setLocalStageOverrides({});
    try {
      setLocalStageOverrides({});
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ["/api/recruitment/jobs", jobId],
        }),
        queryClient.refetchQueries({
          queryKey: ["/api/recruitment/candidates/job", jobId],
        }),
      ]);
      toast({
        title: "Pipeline Refreshed",
        description: "The latest candidate data has been loaded.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Refresh failed:", error);
      toast({
        title: "Refresh Failed",
        description: "Failed to reload pipeline data.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Map API candidates to KanbanCandidate shape, keep local overrides for stage transitions
  const [localStageOverrides, setLocalStageOverrides] = useState<
    Record<
      string,
      {
        stage: RecruiterStage;
        stageUpdatedAt: string;
        rejectionReason?: string;
      }
    >
  >({});

  const candidates = useMemo(() => {
    const mapped = apiCandidates.map((c, i) => mapApiCandidateToKanban(c, i));
    return mapped.map((c) => {
      const override = localStageOverrides[c.id];
      if (override) {
        return { ...c, ...override };
      }
      return c;
    });
  }, [apiCandidates, localStageOverrides]);

  // Identity is matched here, against the names the board was already given —
  // the server sends `revealedName` only once it has decided this recruiter may
  // see it, so an unrevealed candidate cannot be found by their real name.
  // Resume search cannot answer this at all: names are redacted out of the index
  // before it is built.
  const nameSearch = useMemo(
    () => matchCandidatesByName(resumeQuery, candidates),
    [resumeQuery, candidates]
  );

  // The residual, not the raw query: a surname left in reads to the query
  // planner as a hard skill requirement that no resume satisfies.
  const resumeSearch = useJobResumeSearch(jobId, nameSearch.residual);

  // After the calendar-OAuth round-trip the user lands back here; reopen the
  // interview dialog for the candidate they were acting on. Runs once, only
  // after candidate + calendar status have hydrated.
  const hasResumedInterview = useRef(false);
  useEffect(() => {
    if (hasResumedInterview.current) return;
    if (candidatesLoading || calendarLoading) return;
    hasResumedInterview.current = true;

    const resume = consumeInterviewInviteResume();
    if (!resume || resume.jobId !== jobId || !hasCalendar) return;

    const candidate = candidates.find((c) => c.id === resume.candidateId);
    if (!candidate) return;

    setInterviewCandidate(candidate);
    setShowInterviewDialog(true);
  }, [candidatesLoading, calendarLoading, hasCalendar, jobId, candidates]);

  // Build job info for display
  const jobInfo = useMemo(() => {
    if (!jobData) return null;
    return {
      title: jobData.title,
      companyName: jobData.companyName,
      location: jobData.location || "",
      salaryMin: Number(jobData.salaryRangeMin),
      salaryMax: Number(jobData.salaryRangeMax),
      salaryCurrency: jobData.salaryCurrency,
      salaryPeriod: jobData.salaryPeriod,
    };
  }, [jobData]);

  /** Facts the removed hero banner carried, kept on one muted line. */
  const headerMeta = useMemo(() => {
    if (!jobInfo) return [] as string[];
    const salary = isValidSalaryRange(jobInfo.salaryMin, jobInfo.salaryMax)
      ? `${formatSalaryRange(
          jobInfo.salaryMin,
          jobInfo.salaryMax,
          jobInfo.salaryCurrency
        )}${
          jobInfo.salaryPeriod
            ? ` / ${formatSalaryPeriod(jobInfo.salaryPeriod).toLowerCase()}`
            : ""
        }`
      : null;
    return [jobInfo.companyName, jobInfo.location, salary].filter(
      (part): part is string => Boolean(part)
    );
  }, [jobInfo]);

  const jobsListPath =
    jobData?.status === "closed" ||
    (location.state as { jobsTab?: string } | null)?.jobsTab === "closed"
      ? `${TAB_ROUTE_BASES.myJobPosts}/closed`
      : `${TAB_ROUTE_BASES.myJobPosts}/active`;

  const displayStages = useMemo(() => {
    if (stagesLoading || apiStages.length === 0) {
      return PIPELINE_STAGES.map((s) => ({
        id: s.id,
        label: s.label,
        ...STAGE_COLORS[s.id],
      }));
    }
    // Order columns by the client's canonical board order (ACTIVE_KANBAN_STAGES)
    // rather than the DB stage_order, so placement is controlled here.
    const recruiterStages = apiStages
      .filter((s) => ACTIVE_KANBAN_STAGES.includes(s.stageKey))
      .sort(
        (a, b) =>
          ACTIVE_KANBAN_STAGES.indexOf(a.stageKey) -
          ACTIVE_KANBAN_STAGES.indexOf(b.stageKey)
      );
    return recruiterStages.map((s) => {
      const colors = STAGE_COLORS[s.stageKey] ?? STAGE_COLORS.rejected;
      return {
        id: s.stageKey as RecruiterStage,
        label: s.label,
        ...colors,
      };
    });
  }, [apiStages, stagesLoading]);

  const filteredDisplayStages = useMemo(() => {
    if (selectedStages === null) return [];
    return displayStages.filter(
      (s) =>
        selectedStages.length === 0 ||
        selectedStages.includes(s.id) ||
        (forceShowHiredStage && s.id === "hired")
    );
  }, [displayStages, selectedStages, forceShowHiredStage]);

  // Modals
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [interviewCandidate, setInterviewCandidate] =
    useState<KanbanCandidate | null>(null);
  const [calendarConnectAction, setCalendarConnectAction] =
    useState<InterviewCalendarConnectAction | null>(null);
  const [shortlistCandidate, setShortlistCandidate] =
    useState<KanbanCandidate | null>(null);
  const [showShortlistConfirm, setShowShortlistConfirm] = useState(false);
  const [rejectCandidate, setRejectCandidate] =
    useState<KanbanCandidate | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [reinstateCandidate, setReinstateCandidate] =
    useState<KanbanCandidate | null>(null);
  const [showReinstateDialog, setShowReinstateDialog] = useState(false);
  const [reinstateError, setReinstateError] = useState<string | null>(null);
  const [outcomeCandidate, setOutcomeCandidate] =
    useState<KanbanCandidate | null>(null);
  const [showOutcomeDialog, setShowOutcomeDialog] = useState(false);
  const [outcomeError, setOutcomeError] = useState<string | null>(null);
  const isOutcomePending = outcomeMutation.isPending;

  // Hired flow (success-fee path): hire / release / edit-classification dialogs.
  // All three source connectors from /payout/:candidateId/state. The Hire dialog
  // pre-fetches them here (the Release and Edit dialogs fetch internally and
  // only need the candidate identity to open). getCandidateDetail deliberately
  // withholds connectors until the candidate is hired, so it cannot be used for
  // this — the Hire dialog opens one stage earlier, at interview_completed.
  // Classification is null on those rows at this point; the dialog defaults it.
  type HiredDialogState = {
    candidate: KanbanCandidate;
    connectors: import("@/lib/api/recruitment").PayoutStateConnector[];
  };
  const [hireDialogState, setHireDialogState] =
    useState<HiredDialogState | null>(null);
  const [releaseDialogState, setReleaseDialogState] = useState<{
    candidate: KanbanCandidate;
    scope: "connector" | "candidate";
  } | null>(null);
  const [editClassDialogState, setEditClassDialogState] = useState<{
    candidate: KanbanCandidate;
  } | null>(null);

  const openHireDialog = async (candidate: KanbanCandidate) => {
    try {
      const state = await recruitmentApi.getCandidatePayoutState(candidate.id);
      setHireDialogState({
        candidate,
        connectors: state.connectors ?? [],
      });
    } catch (e) {
      toast({
        title: "Could not load candidate connectors",
        description: (e as Error)?.message ?? "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Dashboard "Payouts Due" deep link (?payout=<candidateId>&payoutScope=…):
  // reveal the Hired column, highlight + scroll to the card, then open the
  // scoped Release dialog. Params are stripped so a refresh doesn't replay it.
  useEffect(() => {
    const payoutCandidateId = searchParams.get(PAYOUT_DEEP_LINK_PARAM);
    if (
      !payoutCandidateId ||
      !jobId ||
      candidatesLoading ||
      selectedStages === null
    ) {
      return;
    }

    const scope: PayoutScope =
      searchParams.get(PAYOUT_SCOPE_PARAM) === "candidate"
        ? "candidate"
        : "connector";
    const linkKey = `${jobId}:${payoutCandidateId}:${scope}`;
    if (processedPayoutDeepLinkRef.current === linkKey) return;
    processedPayoutDeepLinkRef.current = linkKey;

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(PAYOUT_DEEP_LINK_PARAM);
        next.delete(PAYOUT_SCOPE_PARAM);
        return next;
      },
      { replace: true }
    );

    const match = candidates.find((c) => c.id === payoutCandidateId);
    if (!match) {
      toast({
        title: "Payout not found",
        description: "This candidate is no longer in this job's pipeline.",
        variant: "destructive",
      });
      return;
    }

    if (selectedStages.length > 0 && !selectedStages.includes("hired")) {
      setForceShowHiredStage(true);
    }
    setPayoutFilterExemptCandidateId(match.id);
    setPayoutDeepLink({ candidate: match, scope });
  }, [
    apiCandidates,
    candidates,
    candidatesLoading,
    jobId,
    searchParams,
    selectedStages,
    setSearchParams,
    toast,
  ]);

  useEffect(() => {
    if (!payoutDeepLink) return;
    const openTimer = window.setTimeout(
      () => setReleaseDialogState(payoutDeepLink),
      PAYOUT_DEEP_LINK_OPEN_DELAY_MS
    );
    const clearTimer = window.setTimeout(
      () => setPayoutDeepLink(null),
      PAYOUT_DEEP_LINK_HIGHLIGHT_MS
    );
    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(clearTimer);
    };
  }, [payoutDeepLink]);

  // Grouped once: filterCandidates runs per column AND per stage inside the
  // Filter Stages dropdown, so recomputing the grouping there would make the
  // added relevance sort O(stages x candidates log candidates) per render.
  const candidatesByStageMap = useMemo(() => {
    const map = new Map<RecruiterStage, KanbanCandidate[]>();
    for (const candidate of candidates) {
      const bucket = map.get(candidate.stage);
      if (bucket) bucket.push(candidate);
      else map.set(candidate.stage, [candidate]);
    }
    return map;
  }, [candidates]);

  const candidatesByStage = useCallback(
    (stageId: RecruiterStage) => candidatesByStageMap.get(stageId) ?? [],
    [candidatesByStageMap]
  );

  const resumeFilterActive = resumeSearch.isActive && !resumeSearch.error;
  const resumeMatchById = resumeSearch.matchById;
  const nameMatchIds = nameSearch.candidateIds;
  const nameFilterActive = nameMatchIds.size > 0;
  const boardSearchActive = nameFilterActive || resumeFilterActive;

  const filterCandidates = useCallback(
    (list: KanbanCandidate[]) => {
      let filtered = list;

      if (matchScoreRanges.length) {
        filtered = filtered.filter((c) =>
          candidateMatchesScoreRanges(c.matchScore, matchScoreRanges)
        );
      }

      if (nameFilterActive) {
        // A named candidate is who the recruiter asked for, so the name decides
        // who appears. The rest of the query still ran as a resume search — it
        // supplies their badge, their condition chips, and the order below.
        filtered = filtered.filter((c) => nameMatchIds.has(c.id));
      } else if (resumeFilterActive) {
        filtered = filtered.filter((c) => resumeMatchById.has(c.id));
      }

      if (resumeFilterActive) {
        // Strongest match leads the column, whichever filter chose the rows.
        // slice() first: the grouped arrays are memoized and shared, so sorting
        // in place would permanently reorder the board's source data.
        filtered = filtered.slice().sort(byResumeRank(resumeMatchById));
      }

      if (payoutFilterExemptCandidateId) {
        const exempt = list.find((c) => c.id === payoutFilterExemptCandidateId);
        if (exempt && !filtered.some((c) => c.id === exempt.id)) {
          filtered = [...filtered, exempt];
        }
      }

      return filtered;
    },
    [
      matchScoreRanges,
      nameFilterActive,
      nameMatchIds,
      resumeFilterActive,
      resumeMatchById,
      payoutFilterExemptCandidateId,
    ]
  );

  // What survives the other filters and stage visibility — a hit can sit in a
  // hidden column, which is the difference between "no matches" and "none here".
  const visibleResumeMatchCount = useMemo(
    () =>
      boardSearchActive
        ? filteredDisplayStages.reduce(
            (total, stage) =>
              total + filterCandidates(candidatesByStage(stage.id)).length,
            0
          )
        : 0,
    [
      boardSearchActive,
      filteredDisplayStages,
      filterCandidates,
      candidatesByStage,
    ]
  );

  // Counts filter groups, not selections, so the badge reads as "2 filters
  // applied" — the per-group selection counts live inside the drawer.
  const activeFilterCount =
    (matchScoreRanges.length > 0 ? 1 : 0) +
    ((selectedStages?.length ?? 0) > 0 ? 1 : 0);

  // Local state drives the board immediately; the save is fire-and-forget, as
  // it was in the dropdown this replaced. The catch is not a swallowed error —
  // usePipelineFilterConfig's onError already raises the toast, and without it
  // the rejected mutateAsync surfaces as an unhandled rejection on top of it.
  const handleSelectedStagesChange = useCallback(
    (next: string[]) => {
      setSelectedStages(next);
      setForceShowHiredStage(false);
      void savePipelineFilter("recruiter", next).catch(() => {});
    },
    [savePipelineFilter]
  );

  const handleClearAllFilters = useCallback(() => {
    setMatchScoreRanges([]);
    handleSelectedStagesChange([]);
  }, [setMatchScoreRanges, handleSelectedStagesChange]);

  const showResumeEmptyState =
    boardSearchActive && !resumeSearch.loading && visibleResumeMatchCount === 0;

  // Actions
  const handleShortlist = (candidate: KanbanCandidate) => {
    setShortlistCandidate(candidate);
    setShowShortlistConfirm(true);
  };

  const confirmShortlist = () => {
    if (!shortlistCandidate) return;
    shortlistMutation.mutate(shortlistCandidate.id, {
      onSuccess: () => {
        toast({
          title: "Candidate shortlisted",
          description: `${shortlistCandidate.anonymousId} has been shortlisted.`,
        });
        setShowShortlistConfirm(false);
        setShortlistCandidate(null);
        setShowCandidateModal(false);
      },
    });
  };

  const handleReject = (candidate: KanbanCandidate) => {
    setRejectCandidate(candidate);
    setShowRejectDialog(true);
  };

  const confirmReject = (
    category: string,
    note: string,
    options?: { onSuccess?: () => void }
  ) => {
    if (!rejectCandidate) return;
    rejectMutation.mutate(
      {
        candidateId: rejectCandidate.id,
        payload: { category, note: note || undefined },
      },
      {
        onSuccess: () => {
          options?.onSuccess?.();
          toast({
            title: "Candidate rejected",
            description: `${rejectCandidate.anonymousId} has been rejected`,
          });
          setShowRejectDialog(false);
          setRejectCandidate(null);
          setShowCandidateModal(false);
        },
        onError: () => {
          toast({
            title: "Failed to reject candidate",
            description: "Something went wrong. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  // Reinstate — move a rejected candidate back to a stage they already held.
  // The eligible stages are fetched inside the dialog from the server; this
  // page only forwards the choice. No payment is involved either way.
  const handleReinstate = (candidate: KanbanCandidate) => {
    setReinstateCandidate(candidate);
    setReinstateError(null);
    setShowReinstateDialog(true);
  };

  const confirmReinstate = (
    targetStageKey: string,
    options?: { onSuccess?: () => void }
  ) => {
    if (!reinstateCandidate) return;
    const candidate = reinstateCandidate;
    reinstateMutation.mutate(
      { candidateId: candidate.id, payload: { targetStageKey } },
      {
        onSuccess: (data) => {
          options?.onSuccess?.();
          toast({
            title: "Candidate moved back",
            description: `${candidate.anonymousId} is now in ${data.stageLabel}`,
          });
          setShowReinstateDialog(false);
          setReinstateCandidate(null);
          setReinstateError(null);
          setShowCandidateModal(false);
        },
        onError: (error: unknown) => {
          setReinstateError(
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again."
          );
        },
      }
    );
  };

  const handleMarkOutcome = (candidate: KanbanCandidate) => {
    setOutcomeCandidate(candidate);
    setOutcomeError(null);
    setShowOutcomeDialog(true);
  };

  const confirmOutcome = (
    outcome: "completed" | "no_show" | "cancelled",
    comment: string,
    options?: { onSuccess?: () => void }
  ) => {
    if (!outcomeCandidate) return;
    const candidate = outcomeCandidate;
    outcomeMutation.mutate(
      {
        candidateId: candidate.id,
        payload: {
          outcome,
          ...(outcome === "completed"
            ? { completedComment: comment || undefined }
            : { comment: comment || undefined }),
        },
      },
      {
        onSuccess: () => {
          options?.onSuccess?.();
          toast({
            title: "Interview outcome recorded",
            description:
              outcome === "completed"
                ? `${candidate.anonymousId} moved to Interview Completed`
                : `${candidate.anonymousId} has been rejected`,
          });
          setShowOutcomeDialog(false);
          setOutcomeCandidate(null);
        },
        onError: (error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.";
          setOutcomeError(message);
        },
      }
    );
  };

  // Stage → connect-popup header action, matching how the interview dialog
  // derives isReschedule/isResend from the candidate's stage.
  const resolveInterviewAction = (
    candidate: KanbanCandidate
  ): InterviewCalendarConnectAction => {
    if (candidate.stage === "interview_scheduled") return "reschedule";
    if (candidate.stage === "interview_invite_sent") return "resend";
    return "invite";
  };

  // Gate the interview flow on a connected calendar. With no calendar we open
  // the in-place connect popup (instead of letting the user fill a form the
  // server would reject) and remember the candidate so the dialog can reopen
  // after the OAuth round-trip. The server check remains the real boundary.
  const openInterviewFlow = (candidate: KanbanCandidate) => {
    if (!calendarLoading && !hasCalendar && jobId) {
      setInterviewInviteResume({ jobId, candidateId: candidate.id });
      setCalendarConnectAction(resolveInterviewAction(candidate));
      return;
    }
    setInterviewCandidate(candidate);
    setShowInterviewDialog(true);
  };

  const handleScheduleInterview = (candidate: KanbanCandidate) => {
    openInterviewFlow(candidate);
  };

  const handleInterviewInviteSent = () => {
    if (interviewCandidate) {
      const wasReschedule = interviewCandidate.stage === "interview_scheduled";
      const candidateId = interviewCandidate.id;

      setLocalStageOverrides((prev) => ({
        ...prev,
        [candidateId]: {
          stage: "interview_invite_sent" as RecruiterStage,
          stageUpdatedAt: utcDayjs().format("YYYY-MM-DD"),
        },
      }));

      void queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/candidates/job", jobId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/candidates", candidateId],
      });

      toast({
        title: wasReschedule
          ? "Interview rescheduled"
          : "Interview invite sent",
        description: wasReschedule
          ? `${interviewCandidate.anonymousId} will receive a new booking link via email.`
          : `${interviewCandidate.anonymousId} will receive a booking link via email.`,
      });
    }
    setShowInterviewDialog(false);
    setInterviewCandidate(null);
    setShowCandidateModal(false);
  };

  const handleResendInvite = (candidate: KanbanCandidate) => {
    openInterviewFlow(candidate);
  };

  const handleViewCandidate = (candidate: KanbanCandidate) => {
    setSelectedCandidate(candidate);
    setShowCandidateModal(true);
  };

  // Loading state — wait for filter config to hydrate before showing board
  if (jobLoading || candidatesLoading || selectedStages === null) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-6 space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="flex gap-4 flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-[340px] flex-shrink-0 space-y-3">
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header — inline title (Final.html pipeline screen) */}
      <div className="flex-shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-[21px] font-extrabold leading-tight tracking-[-0.03em] text-brand-gradient">
              {jobInfo?.title || "Job Pipeline"}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-muted-foreground">
              <span>
                {candidates.length} candidate
                {candidates.length === 1 ? "" : "s"}
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
        </div>
      </div>

      {/* Search + Filter + Refresh — held in a bar card, as on Final.html's `.jpbar` */}
      <div className="flex-shrink-0 px-4 pt-4 sm:px-6">
        <div className="flex flex-nowrap items-center gap-3 overflow-x-auto thin-scroll rounded-2xl border border-border bg-card px-3 py-2.5 shadow-sm lg:overflow-visible lg:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-nowrap lg:gap-4 lg:flex-1 lg:min-w-0">
            {/* Back reads as navigation, not another tool: ghost surface, the
                app's icon-chip idiom, and the arrow slides left on hover. */}
            <Button
              variant="ghost"
              onClick={() => navigate(jobsListPath)}
              aria-label="Back to My Job Posts"
              className="group h-10 shrink-0 gap-2 rounded-xl py-0 pl-1.5 pr-3 text-muted-foreground transition-all duration-200 hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] border border-border bg-muted/50 transition-all duration-200 group-hover:-translate-x-0.5 group-hover:border-brand-amethyst/20 group-hover:bg-card group-hover:shadow-sm">
                <ArrowLeft />
              </span>
              My Job Posts
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

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(true)}
              aria-haspopup="dialog"
              aria-expanded={showFilters}
              className="h-10 shrink-0 gap-2 rounded-xl border border-border px-3 text-sm font-medium transition-all hover:border-brand-amethyst/20 hover:bg-brand-amethyst/10 hover:text-brand-amethyst lg:ml-auto"
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

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 shrink-0 gap-2 rounded-xl border border-border px-3 text-sm font-medium transition-all hover:border-brand-amethyst/20 hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
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
            </TooltipProvider>
          </div>
        </div>
      </div>

      <PipelineFilterSheet
        open={showFilters}
        onOpenChange={setShowFilters}
        matchScoreRanges={matchScoreRanges}
        onMatchScoreRangesChange={setMatchScoreRanges}
        stages={displayStages}
        selectedStages={selectedStages}
        onSelectedStagesChange={handleSelectedStagesChange}
        getStageCount={(stageId) =>
          filterCandidates(candidatesByStage(stageId as RecruiterStage)).length
        }
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
        {showResumeEmptyState ? (
          <div className="h-full px-4 sm:px-6 py-6">
            {/* The recruiter's own words, not the server's echo — that one is
                the residual, with the name already stripped out of it. */}
            <ResumeSearchEmptyState
              query={resumeQuery}
              matchedButFiltered={nameFilterActive}
              onClear={clearResumeQuery}
            />
          </div>
        ) : (
          <div
            className="flex gap-4 px-4 sm:px-6 py-6 h-full"
            style={{ minWidth: "fit-content" }}
          >
            {filteredDisplayStages.map((stage) => {
              const stageCandidates = filterCandidates(
                candidatesByStage(stage.id)
              );
              return (
                <div
                  key={stage.id}
                  className="flex-shrink-0 w-[340px] flex flex-col bg-white border border-slate-200/70 rounded-2xl shadow-sm overflow-hidden"
                  style={{ maxHeight: "100%" }}
                >
                  <div
                    className={cn(
                      "px-4 py-3.5 flex-shrink-0 bg-white border-b-2",
                      stage.headBorder
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "h-[9px] w-[9px] rounded-full ring-[3px]",
                            stage.color,
                            stage.dotRing
                          )}
                        />
                        <h3 className="font-bold text-sm text-slate-800">
                          {stage.label}
                        </h3>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold rounded-full px-2.5 py-0.5 min-w-[26px] text-center",
                          stage.countBg,
                          stage.countText
                        )}
                      >
                        {stageCandidates.length}
                      </span>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 min-h-0 p-2 bg-app">
                    <div className="space-y-3 p-1">
                      {stageCandidates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                          <Users className="h-7 w-7 mb-2 opacity-40" />
                          <span className="text-sm font-medium">
                            No candidates
                          </span>
                        </div>
                      ) : (
                        stageCandidates.map((candidate) => (
                          <KanbanCandidateCard
                            key={candidate.id}
                            candidate={candidate}
                            relevance={resumeMatchById.get(candidate.id)}
                            relevanceTopScore={resumeSearch.topScore}
                            isHighlighted={
                              payoutDeepLink?.candidate.id === candidate.id
                            }
                            onView={() => handleViewCandidate(candidate)}
                            onShortlist={() => handleShortlist(candidate)}
                            onReject={
                              canReject
                                ? () => handleReject(candidate)
                                : undefined
                            }
                            onReinstate={
                              canReject
                                ? () => handleReinstate(candidate)
                                : undefined
                            }
                            onScheduleInterview={() =>
                              handleScheduleInterview(candidate)
                            }
                            onResendInvite={() => handleResendInvite(candidate)}
                            onMarkOutcome={() => handleMarkOutcome(candidate)}
                            onMoveToHired={() => openHireDialog(candidate)}
                            onReleaseConnectorPayout={() =>
                              setReleaseDialogState({
                                candidate,
                                scope: "connector",
                              })
                            }
                            onReleaseCandidateBonus={() =>
                              setReleaseDialogState({
                                candidate,
                                scope: "candidate",
                              })
                            }
                            onEditClassification={() =>
                              setEditClassDialogState({ candidate })
                            }
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

      {/* Candidate Detail Modal */}
      <CandidateDetailModal
        open={showCandidateModal}
        onOpenChange={setShowCandidateModal}
        candidate={selectedCandidate}
        detail={candidateDetail}
        loading={candidateDetailLoading}
        onReject={handleReject}
        canReject={canReject}
        onShortlist={handleShortlist}
        onScheduleInterview={handleScheduleInterview}
        onResendInvite={handleResendInvite}
        onPreviewResume={handlePreviewResume}
        onOpenResume={handleOpenResume}
      />

      {/* Shortlist Confirmation */}
      <ShortlistConfirmDialog
        open={showShortlistConfirm}
        onOpenChange={setShowShortlistConfirm}
        jobTitle={jobInfo?.title || ""}
        candidateLabel={shortlistCandidate?.anonymousId ?? ""}
        onConfirm={confirmShortlist}
        isPending={shortlistMutation.isPending}
      />

      {/* Reject Dialog */}
      <RejectDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        candidate={rejectCandidate}
        onConfirm={confirmReject}
        isPending={rejectMutation.isPending}
      />

      {/* Move Back to Stage (reinstate) Dialog */}
      <ReinstateDialog
        open={showReinstateDialog}
        onOpenChange={(open) => {
          if (!open) setReinstateError(null);
          setShowReinstateDialog(open);
        }}
        candidate={reinstateCandidate}
        onConfirm={confirmReinstate}
        isPending={reinstateMutation.isPending}
        errorMessage={reinstateError}
      />

      {/* Interview Outcome Dialog */}
      <InterviewOutcomeDialog
        open={showOutcomeDialog}
        onOpenChange={(open) => {
          if (!open) setOutcomeError(null);
          setShowOutcomeDialog(open);
        }}
        candidate={outcomeCandidate}
        onConfirm={confirmOutcome}
        isPending={isOutcomePending}
        errorMessage={outcomeError}
        onClearError={() => setOutcomeError(null)}
      />

      {/* Hired-flow dialogs. Connector classification + manual release apply to
          every job — the connector payout is released here gated by the
          waiting period, regardless of the success fee. */}
      {hireDialogState && (
        <HireCandidateDialog
          open={!!hireDialogState}
          onOpenChange={(open) => {
            if (!open) setHireDialogState(null);
          }}
          candidateId={hireDialogState.candidate.id}
          candidateLabel={hireDialogState.candidate.anonymousId}
          connectors={hireDialogState.connectors}
        />
      )}
      {releaseDialogState && (
        <ReleasePayoutDialog
          open={!!releaseDialogState}
          onOpenChange={(open) => {
            if (!open) {
              setReleaseDialogState(null);
              setPayoutFilterExemptCandidateId(null);
            }
          }}
          candidateId={releaseDialogState.candidate.id}
          candidateLabel={releaseDialogState.candidate.anonymousId}
          scope={releaseDialogState.scope}
        />
      )}
      {editClassDialogState && (
        <EditClassificationDialog
          open={!!editClassDialogState}
          onOpenChange={(open) => {
            if (!open) setEditClassDialogState(null);
          }}
          candidateId={editClassDialogState.candidate.id}
          candidateLabel={editClassDialogState.candidate.anonymousId}
        />
      )}

      {/* Interview Scheduling Dialog */}
      <SendInterviewInviteRecruiterDialog
        open={showInterviewDialog}
        onOpenChange={setShowInterviewDialog}
        candidate={
          interviewCandidate
            ? {
                id: interviewCandidate.id,
                name: interviewCandidate.anonymousId,
                email: "candidate@example.com",
                title: interviewCandidate.currentTitle,
                company: interviewCandidate.currentCompany,
                matchScore: 0,
              }
            : null
        }
        jobTitle={jobInfo?.title || ""}
        onInviteSent={handleInterviewInviteSent}
        isReschedule={interviewCandidate?.stage === "interview_scheduled"}
        isResend={interviewCandidate?.stage === "interview_invite_sent"}
      />

      <InterviewCalendarConnectModal
        open={!!calendarConnectAction}
        action={calendarConnectAction ?? "invite"}
        returnTo={location.pathname}
        onOpenChange={(open) => {
          if (!open) {
            // Dismissed without connecting — drop the pending resume intent so a
            // later page load doesn't reopen the dialog unexpectedly.
            setCalendarConnectAction(null);
            clearInterviewInviteResume();
          }
        }}
      />

      {/* Resume Preview Dialog */}
      <Dialog open={showResumePreview} onOpenChange={setShowResumePreview}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-red-50 border border-red-100">
                  <FileText className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <DialogTitle className="text-base">
                    {candidateDetail?.resumeFileName || "Resume"}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Resume preview for{" "}
                    {candidateDetail?.revealedName ||
                      candidateDetail?.anonymousLabel}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2"></div>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-slate-100 flex flex-col">
            {resumeLoading && !resumeUrl ? (
              <div className="flex items-center justify-center h-full gap-2 text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading resume…
              </div>
            ) : resumeUrl &&
              isHttpOrHttpsUrl(resumeUrl) &&
              isPdfFile(resumeUrl, candidateDetail?.resumeFileName) ? (
              <iframe
                src={`${resumeUrl}#toolbar=0`}
                className="w-full h-full border-0"
                title="Resume Preview"
                referrerPolicy="no-referrer"
              />
            ) : resumeUrl ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                  <Shield className="h-8 w-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Preview Restricted
                  </h3>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto mb-6">
                    For security reasons, this file type cannot be previewed
                    directly. You can open it safely in a new tab.
                  </p>
                  {isHttpOrHttpsUrl(resumeUrl) ? (
                    <Button asChild variant="outline" className="gap-2">
                      <a
                        href={resumeUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open Resume Safely
                      </a>
                    </Button>
                  ) : (
                    <Button disabled variant="outline" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Open Resume Safely
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                No resume available
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
