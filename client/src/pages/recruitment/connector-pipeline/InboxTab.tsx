import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadMoreLoader } from "@/components/ui/loader";
import { CandidateRelevanceRow } from "@/components/recruitment/CandidateRelevance";
import type { ResumeSearchMatch } from "@/lib/api/recruitment";
import { cn } from "@/lib/utils";
import { ReferCandidatesEmptyState } from "./ReferCandidatesEmptyState";
import {
  Building2,
  MapPin,
  Sparkles,
  ThumbsUp,
  RefreshCw,
  Inbox,
  AlertCircle,
  Loader2,
  XCircle,
  CheckCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Mail,
  SearchX,
  FileText,
  Briefcase,
  Eye,
  Pencil,
  Upload,
} from "lucide-react";
import {
  CONNECTOR_EMAIL_LOG_STAGES,
  RECRUITER_POOL_EMAIL_LOG_STAGES,
  type RecruitmentEmailLogsAudience,
} from "@/lib/api/recruitment-email-logs";
import { RecruitmentEmailLogsButton } from "@/components/recruitment/RecruitmentEmailLogsButton";
import { htmlToPlainText } from "@/lib/rich-text";
import {
  formatDateTime,
  formatLocalizedShortDate,
} from "@/utils/dateFormatter";
import {
  formatSalaryPeriod,
  formatSalaryRange,
  isValidSalaryRange,
} from "@/utils/formatter";
import { useRetryUploadJob } from "@/hooks/useRetryUploadJob";
import { useDismissUploadJob } from "@/hooks/useDismissUploadJob";
import { useToast } from "@/hooks/use-toast";
import { MAX_AI_RETRY_ATTEMPTS } from "@/constants/recruitmentRetry";
import { UploadFailureNotice } from "@/components/recruitment/UploadFailureNotice";
import { InboxJobSkillsRow } from "./InboxJobSkillsRow";
import { ConnectorInboxJobCardActions } from "@/components/recruitment/ConnectorInboxJobCardActions";
import { ConnectorCandidateDetailModal } from "./ConnectorCandidateDetailModal";
import {
  CONNECTOR_CARD_BTN_NEUTRAL,
  CONNECTOR_CARD_BTN_PRIMARY,
  CONNECTOR_CARD_BTN_REJECT,
  CONNECTOR_KANBAN_CARD_SHELL,
  ConnectorCardActionRow,
} from "./connector-card-buttons";
import type {
  InboxJob,
  InboxCandidate,
  InboxUploadJob,
  InboxItem,
  InboxLinkedUploadJob,
  ConnectorStage,
} from "./types";
import { getMatchScoreBadgeClass } from "@/lib/recruitment/match-score-colors";
import { CONNECTOR_STAGE_COLORS } from "./types";
import {
  canReplacePoolResume,
  poolReplaceTarget,
} from "@/lib/recruitment/connector-replace-resume.utils";
import type { ReplaceResumeTarget } from "@/lib/recruitment/connector-replace-resume.utils";

const STATUS_BADGE_CONFIG: Record<
  string,
  { label: string; icon: typeof CheckCircle; className: string }
> = {
  processing: {
    label: "Processing",
    icon: Loader2,
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  consent_pending: {
    label: "Consent Pending",
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  consent_accepted: {
    label: "Consent Accepted",
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  consent_declined: {
    label: "Consent Declined",
    icon: XCircle,
    className: "bg-red-50 text-red-700 border-red-200",
  },
  consent_superseded: {
    label: "Another connector accepted",
    icon: AlertCircle,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  connector_declined: {
    label: "Declined by you",
    icon: XCircle,
    className: "bg-slate-50 text-slate-600 border-slate-200",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

function InboxCandidateStatusBadge({
  candidate,
}: {
  candidate: InboxCandidate;
}) {
  const config = STATUS_BADGE_CONFIG[candidate.status];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <>
      <Badge
        variant="outline"
        className={cn("gap-1 text-xs px-3 py-1.5", config.className)}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
      {candidate.status === "connector_declined" &&
      candidate.connectorDeclinedAt ? (
        <span className="text-[10px] text-slate-500 mt-1 block">
          Declined At {formatDateTime(candidate.connectorDeclinedAt)}
        </span>
      ) : null}
      {candidate.status === "consent_declined" &&
      candidate.consentRespondedAt ? (
        <span className="text-[10px] text-slate-500 mt-1 block">
          Declined At {formatDateTime(candidate.consentRespondedAt)}
        </span>
      ) : null}
    </>
  );
}

function ReplaceResumeActionButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      className={cn(CONNECTOR_CARD_BTN_NEUTRAL, "w-full")}
    >
      <Upload className="h-3.5 w-3.5" />
      Update resume
    </Button>
  );
}

function InboxCandidateActionFooter({
  candidate,
  jobTitle,
  jobCompany,
  onApprove,
  onResendConsent,
  onChangeConsentEmail,
  onDecline,
  onReplaceResume,
  approvingMatchId,
  resendingMatchId,
  decliningMatchId,
  readOnly = false,
}: {
  candidate: InboxCandidate;
  jobTitle: string;
  jobCompany: string;
  onApprove: (candidate: InboxCandidate, jobTitle: string) => void;
  onResendConsent?: (candidate: InboxCandidate, jobTitle: string) => void;
  onChangeConsentEmail?: (candidate: InboxCandidate, jobTitle: string) => void;
  onDecline?: (candidate: InboxCandidate, jobTitle: string) => void;
  onReplaceResume?: (target: ReplaceResumeTarget) => void;
  approvingMatchId: string | null;
  resendingMatchId?: string | null;
  decliningMatchId?: string | null;
  readOnly?: boolean;
}) {
  const showReplace =
    canReplacePoolResume(candidate) && Boolean(onReplaceResume);
  const openReplace = () =>
    onReplaceResume?.(poolReplaceTarget(candidate, jobTitle, jobCompany));

  // Read-only columns (e.g. Not Qualified) show the card without Refer actions.
  if (readOnly && candidate.status === "pending") {
    if (!showReplace) return null;
    return (
      <ConnectorCardActionRow>
        <ReplaceResumeActionButton onClick={openReplace} />
      </ConnectorCardActionRow>
    );
  }

  if (candidate.status === "processing") {
    return (
      <AiAnalysisStatusBanner message="Resume is being analyzed. Results will appear shortly." />
    );
  }

  if (candidate.status === "failed") {
    return (
      <div>
        <UploadFailureNotice
          className="mb-3"
          failureReason={
            candidate.linkedUploadJob?.failureReason ??
            candidate.failureReason ??
            null
          }
          retryCount={candidate.linkedUploadJob?.retryCount ?? 0}
          showRetryGuidance={Boolean(candidate.linkedUploadJob)}
        />
        {candidate.linkedUploadJob ? (
          <FailedPoolMatchActions linkedUploadJob={candidate.linkedUploadJob} />
        ) : null}
      </div>
    );
  }

  if (candidate.status === "pending" && candidate.isClaimedByOther) {
    return (
      <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        This candidate has already applied to this job through another
        connector.
      </div>
    );
  }

  if (candidate.status === "pending") {
    return (
      <div className="space-y-2">
        {showReplace ? (
          <ReplaceResumeActionButton onClick={openReplace} />
        ) : null}
        <ConnectorCardActionRow>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDecline?.(candidate, jobTitle)}
            disabled={decliningMatchId === candidate.matchId}
            className={cn(CONNECTOR_CARD_BTN_REJECT, "flex-1")}
          >
            {decliningMatchId === candidate.matchId ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            Don't Refer
          </Button>
          <Button
            size="sm"
            onClick={() => onApprove(candidate, jobTitle)}
            disabled={approvingMatchId === candidate.matchId}
            className={cn(CONNECTOR_CARD_BTN_PRIMARY, "flex-1")}
          >
            {approvingMatchId === candidate.matchId ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ThumbsUp className="h-3.5 w-3.5" />
            )}
            Refer Candidate
          </Button>
        </ConnectorCardActionRow>
      </div>
    );
  }

  if (
    candidate.status === "consent_pending" ||
    candidate.status === "consent_superseded"
  ) {
    if (
      candidate.status === "consent_superseded" ||
      candidate.isClaimedByOther
    ) {
      return (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            This candidate has already applied to this job through another
            connector. Resend consent is not available.
          </span>
        </div>
      );
    }
    const showChangeEmail =
      candidate.source === "connector_uploaded" &&
      candidate.status === "consent_pending";

    return (
      <div className="space-y-2">
        {showReplace ? (
          <ReplaceResumeActionButton onClick={openReplace} />
        ) : null}
        <ConnectorCardActionRow
          className={showChangeEmail ? "flex-col sm:flex-row" : undefined}
        >
          {showChangeEmail ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChangeConsentEmail?.(candidate, jobTitle)}
              className={cn(CONNECTOR_CARD_BTN_NEUTRAL, "w-full sm:flex-1")}
            >
              <Pencil className="h-3.5 w-3.5" />
              Change Email
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={() => onResendConsent?.(candidate, jobTitle)}
            disabled={resendingMatchId === candidate.matchId}
            className={cn(
              CONNECTOR_CARD_BTN_PRIMARY,
              showChangeEmail ? "w-full sm:flex-1" : "w-full"
            )}
          >
            {resendingMatchId === candidate.matchId ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Resend Consent
          </Button>
        </ConnectorCardActionRow>
      </div>
    );
  }

  if (
    candidate.status === "connector_declined" ||
    candidate.status === "consent_declined"
  ) {
    return null;
  }

  return (
    <div className="flex flex-col items-end">
      <InboxCandidateStatusBadge candidate={candidate} />
    </div>
  );
}

function InboxPoolMatchCard({
  candidate,
  jobTitle,
  jobCompany,
  stage,
  stageLabel,
  onApprove,
  onResendConsent,
  onChangeConsentEmail,
  onDecline,
  onReplaceResume,
  approvingMatchId,
  resendingMatchId,
  decliningMatchId,
  readOnly = false,
  emailLogsAudience = "connector",
  relevance,
  relevanceTopScore,
}: {
  candidate: InboxCandidate;
  jobTitle: string;
  jobCompany: string;
  stage: ConnectorStage;
  stageLabel?: string;
  onApprove: (candidate: InboxCandidate, jobTitle: string) => void;
  onResendConsent?: (candidate: InboxCandidate, jobTitle: string) => void;
  onChangeConsentEmail?: (candidate: InboxCandidate, jobTitle: string) => void;
  onDecline?: (candidate: InboxCandidate, jobTitle: string) => void;
  onReplaceResume?: (target: ReplaceResumeTarget) => void;
  approvingMatchId: string | null;
  resendingMatchId?: string | null;
  decliningMatchId?: string | null;
  readOnly?: boolean;
  emailLogsAudience?: RecruitmentEmailLogsAudience;
  /** Present only while a resume search is filtering the board. */
  relevance?: ResumeSearchMatch;
  relevanceTopScore?: number;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const matchScore = Math.round(candidate.matchScore);
  const stageColors = CONNECTOR_STAGE_COLORS[stage];
  return (
    <div className={CONNECTOR_KANBAN_CARD_SHELL}>
      {relevance ? (
        <CandidateRelevanceRow
          match={relevance}
          topScore={relevanceTopScore ?? relevance.score}
        />
      ) : null}

      <div className="mb-[11px] flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-[11px]">
          {/* The tile is kept only while processing, where it carries the
              loader. It no longer stands in as an avatar. */}
          {candidate.status === "processing" ? (
            <div
              className={cn(
                "flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px]",
                stageColors.avatarTint
              )}
            >
              <span
                className="inline-flex items-center gap-0.5"
                role="status"
                aria-label="Loading"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand-amethyst animate-loader-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-rose animate-loader-pulse [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-sky animate-loader-pulse [animation-delay:0.4s]" />
              </span>
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="break-words text-[13.5px] font-extrabold leading-snug">
              {candidate.candidateName}
            </p>
          </div>
        </div>
        {candidate.status !== "processing" && candidate.matchScore > 0 ? (
          <Badge
            className={cn(
              "flex-shrink-0 text-xs",
              getMatchScoreBadgeClass(matchScore)
            )}
          >
            {matchScore}%
          </Badge>
        ) : null}
      </div>

      {candidate.source === "connector_uploaded" ||
      candidate.resumeFileName ||
      candidate.linkedUploadJob?.fileName ? (
        <Badge className="mb-2 w-fit max-w-full self-start border-0 bg-secondary text-[10px] uppercase tracking-wider text-secondary-foreground hover:bg-secondary">
          Resume uploaded
        </Badge>
      ) : null}

      {stage === "not_qualified" ? (
        <div className="mb-2 flex items-start gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
          <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
          <span className="text-[11px] font-medium leading-snug text-slate-600">
            AI match score below 50%
          </span>
        </div>
      ) : null}

      <div className="mb-[11px] flex flex-col gap-[5px]">
        {candidate.candidateTitle ? (
          <div className="flex items-start gap-[7px] text-xs font-semibold text-[#4A5161]">
            <Briefcase className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 break-words leading-snug">
              {candidate.candidateTitle}
            </span>
          </div>
        ) : null}
        {jobTitle ? (
          <div className="flex items-start gap-[7px] text-xs font-semibold text-[#4A5161]">
            <Briefcase className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 break-words leading-snug">
              {jobTitle}
            </span>
          </div>
        ) : null}
        {jobCompany ? (
          <div className="flex items-start gap-[7px] text-xs font-semibold text-[#4A5161]">
            <Building2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 break-words leading-snug">
              {jobCompany}
            </span>
          </div>
        ) : null}
        {candidate.candidateEmail ? (
          <div className="flex items-start gap-[7px] text-xs font-semibold text-[#4A5161]">
            <Mail className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 break-all leading-snug">
              {candidate.candidateEmail}
            </span>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "mb-[11px] grid gap-2",
          candidate.matchId &&
            (emailLogsAudience === "recruiter"
              ? RECRUITER_POOL_EMAIL_LOG_STAGES
              : CONNECTOR_EMAIL_LOG_STAGES
            ).has(stage)
            ? "grid-cols-2"
            : "grid-cols-1"
        )}
      >
        <Button
          variant="outline"
          size="sm"
          className={cn(CONNECTOR_CARD_BTN_NEUTRAL, "min-w-0 w-full")}
          onClick={() => setDetailOpen(true)}
        >
          <Eye className="h-3.5 w-3.5" /> View
        </Button>
        {candidate.matchId &&
        (emailLogsAudience === "recruiter"
          ? RECRUITER_POOL_EMAIL_LOG_STAGES
          : CONNECTOR_EMAIL_LOG_STAGES
        ).has(stage) ? (
          <RecruitmentEmailLogsButton
            audience={emailLogsAudience}
            poolMatchId={candidate.matchId}
            className="w-full min-w-0"
          />
        ) : null}
        <ConnectorCandidateDetailModal
          mode="pool"
          candidate={candidate}
          boardStage={stage}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          stageLabel={stageLabel}
        />
      </div>

      <InboxCandidateActionFooter
        candidate={candidate}
        jobTitle={jobTitle}
        jobCompany={jobCompany}
        onApprove={onApprove}
        onResendConsent={onResendConsent}
        onChangeConsentEmail={onChangeConsentEmail}
        onDecline={onDecline}
        onReplaceResume={onReplaceResume}
        approvingMatchId={approvingMatchId}
        resendingMatchId={resendingMatchId}
        decliningMatchId={decliningMatchId}
        readOnly={readOnly}
      />
    </div>
  );
}

export function InboxJobCandidateItem({
  item,
  jobTitle,
  jobCompany,
  stage,
  stageLabel,
  onApprove,
  onResendConsent,
  onChangeConsentEmail,
  onDecline,
  onReplaceResume,
  approvingMatchId,
  resendingMatchId,
  decliningMatchId,
  readOnly = false,
  emailLogsAudience = "connector",
  relevance,
  relevanceTopScore,
}: {
  item: InboxItem;
  jobTitle: string;
  jobCompany: string;
  stage: ConnectorStage;
  stageLabel?: string;
  onApprove: (candidate: InboxCandidate, jobTitle: string) => void;
  onResendConsent?: (candidate: InboxCandidate, jobTitle: string) => void;
  onChangeConsentEmail?: (candidate: InboxCandidate, jobTitle: string) => void;
  onDecline?: (candidate: InboxCandidate, jobTitle: string) => void;
  onReplaceResume?: (target: ReplaceResumeTarget) => void;
  approvingMatchId: string | null;
  resendingMatchId?: string | null;
  decliningMatchId?: string | null;
  readOnly?: boolean;
  emailLogsAudience?: RecruitmentEmailLogsAudience;
  /** Present only while a resume search is filtering the board. */
  relevance?: ResumeSearchMatch;
  relevanceTopScore?: number;
}) {
  if ((item as InboxUploadJob).type === "upload_job") {
    return (
      <div className="w-full min-w-0">
        <UploadJobCard uploadJob={item as InboxUploadJob} />
      </div>
    );
  }

  const candidate = item as InboxCandidate;
  return (
    <div className="w-full min-w-0">
      <InboxPoolMatchCard
        candidate={candidate}
        jobTitle={jobTitle}
        jobCompany={jobCompany}
        stage={stage}
        stageLabel={stageLabel}
        onApprove={onApprove}
        onResendConsent={onResendConsent}
        onChangeConsentEmail={onChangeConsentEmail}
        onDecline={onDecline}
        onReplaceResume={onReplaceResume}
        approvingMatchId={approvingMatchId}
        resendingMatchId={resendingMatchId}
        decliningMatchId={decliningMatchId}
        readOnly={readOnly}
        emailLogsAudience={emailLogsAudience}
        relevance={relevance}
        relevanceTopScore={relevanceTopScore}
      />
    </div>
  );
}

interface InboxTabProps {
  jobs: InboxJob[];
  loading: boolean;
  error: Error | null;
  onViewCandidates: (job: InboxJob) => void;
  onViewJobDetails?: (job: InboxJob) => void;
  onReferJob?: (job: InboxJob) => void;
  onShareJob?: (job: InboxJob) => void;
  onRetry: () => void;
  searchTerm?: string;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

function InboxSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mx-auto">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} className="h-[286px] rounded-2xl" />
      ))}
    </div>
  );
}

export default function InboxTab({
  jobs,
  loading,
  error,
  onViewCandidates,
  onViewJobDetails,
  onReferJob,
  onShareJob,
  onRetry,
  searchTerm,
  scrollContainerRef,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: InboxTabProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const totalCandidates = jobs.reduce((sum, j) => sum + j.candidateCount, 0);

  useEffect(() => {
    const root = scrollContainerRef?.current ?? null;
    const el = sentinelRef.current;
    if (!el || !hasMore || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore) {
          onLoadMore();
        }
      },
      { root, threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore, scrollContainerRef]);

  if (loading) {
    return <InboxSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="h-16 w-16 rounded-full bg-red-50 mx-auto flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          Something went wrong
        </h3>
        <p className="text-slate-500 max-w-md mx-auto mb-4">
          We couldn't load your matched opportunities. Please try again.
        </p>
        <Button variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      </div>
    );
  }

  if (jobs.length === 0) {
    if (searchTerm) {
      return (
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-4">
            <SearchX className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            No results found
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            No matches found for "{searchTerm}". Try a different search term.
          </p>
        </div>
      );
    }
    return (
      <ReferCandidatesEmptyState
        icon={Inbox}
        title="All caught up!"
        description="No pending matches yet. Browse the job marketplace to refer candidates to open roles, or wait for AI-matched opportunities to appear here."
      />
    );
  }

  return (
    <div className="mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-slate-700">
            AI-Matched Opportunities
          </h2>
        </div>
        <Badge
          variant="secondary"
          className="sm:ml-2 px-3 py-1.5 sm:self-start self-end"
        >
          {totalCandidates} candidate{totalCandidates !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {jobs.map((job) => {
          const salaryMin = parseFloat(job.jobSalaryRangeMin) || 0;
          const salaryMax = parseFloat(job.jobSalaryRangeMax) || 0;
          const hasSalary = isValidSalaryRange(salaryMin, salaryMax);
          const requiredSkills = job.jobRequiredSkills ?? [];

          return (
            <Card
              key={job.jobId}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-brand-card"
            >
              <div className="flex flex-1 flex-col p-[18px]">
                <h3 className="mb-2 line-clamp-2 min-h-[2.6rem] text-[15px] font-medium leading-snug tracking-tight text-foreground transition-colors group-hover:text-brand-amethyst">
                  {job.jobTitle}
                </h3>

                <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {job.jobCompany}
                  </span>
                  {job.jobLocation && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.jobLocation}
                    </span>
                  )}
                </div>

                {job.jobDescription && (
                  <p className="mb-3 line-clamp-2 text-[12.4px] leading-relaxed text-muted-foreground">
                    {htmlToPlainText(job.jobDescription)}
                  </p>
                )}

                {requiredSkills.length > 0 && (
                  <InboxJobSkillsRow
                    skills={requiredSkills}
                    onOverflowClick={
                      onViewJobDetails ? () => onViewJobDetails(job) : undefined
                    }
                  />
                )}

                {(hasSalary || job.jobPostedAt) && (
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[11px] border border-border bg-muted/40 px-3 py-2 text-xs">
                    {hasSalary ? (
                      <span className="flex min-w-0 items-center gap-1">
                        <span className="text-muted-foreground">Salary:</span>
                        <span className="font-semibold text-foreground">
                          {formatSalaryRange(
                            salaryMin,
                            salaryMax,
                            job.jobSalaryCurrency
                          )}
                        </span>
                        {job.jobSalaryPeriod && (
                          <span className="text-[11px] text-muted-foreground">
                            / {formatSalaryPeriod(job.jobSalaryPeriod)}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span />
                    )}
                    {job.jobPostedAt && (
                      <span className="flex shrink-0 items-center gap-1 sm:ml-auto">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Posted {formatLocalizedShortDate(job.jobPostedAt)}
                        </span>
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-auto border-t border-dashed border-border pt-3">
                  <ConnectorInboxJobCardActions
                    referCount={job.myReferCount}
                    candidateCount={job.candidateCount}
                    hasSharedLink={job.hasSharedLink}
                    onRefer={onReferJob ? () => onReferJob(job) : undefined}
                    onViewCandidates={() => onViewCandidates(job)}
                    onViewJobDetails={
                      onViewJobDetails ? () => onViewJobDetails(job) : undefined
                    }
                    onShare={onShareJob ? () => onShareJob(job) : undefined}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {hasMore ? <div ref={sentinelRef} className="h-1" aria-hidden /> : null}

      {isLoadingMore ? <LoadMoreLoader className="py-6" /> : null}

      {!hasMore && !isLoadingMore && jobs.length > 0 && (
        <p className="text-center text-sm italic text-muted-foreground py-6">
          You've reached the end
        </p>
      )}
    </div>
  );
}

/** Compact status for AI Analysis cards — full column width, text wraps on second line. */
function AiAnalysisStatusBanner({ message }: { message: string }) {
  return (
    <div className="box-border w-full max-w-full shrink-0 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-2">
      <div
        className="mb-1.5 flex items-center gap-1"
        role="status"
        aria-label="Loading"
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-amethyst animate-loader-pulse" />
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-rose animate-loader-pulse [animation-delay:0.2s]" />
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-sky animate-loader-pulse [animation-delay:0.4s]" />
      </div>
      <p className="m-0 w-full max-w-full text-xs font-medium leading-relaxed text-blue-700 [overflow-wrap:anywhere]">
        {message}
      </p>
    </div>
  );
}

interface UploadJobCardProps {
  uploadJob: InboxUploadJob;
}

function UploadJobCard({ uploadJob }: UploadJobCardProps) {
  const retryMutation = useRetryUploadJob();
  const dismissMutation = useDismissUploadJob();
  const { toast } = useToast();

  const isQueued = uploadJob.status === "queued";
  const isProcessing = uploadJob.status === "processing";
  const isFailed = uploadJob.status === "failed";
  const canRetry = isFailed && uploadJob.retryCount < MAX_AI_RETRY_ATTEMPTS;

  const handleRetry = () => {
    retryMutation.mutate(uploadJob.uploadJobId, {
      onSuccess: () => {
        toast({
          title: "Retry queued",
          description: "Resume will be reprocessed. Refresh to see updates.",
        });
      },
      onError: (error) => {
        toast({
          title: "Retry failed",
          description:
            (error as Error)?.message || "Could not retry this upload.",
          variant: "destructive",
        });
      },
    });
  };

  const handleDismiss = () => {
    dismissMutation.mutate(uploadJob.uploadJobId, {
      onSuccess: () => {
        toast({
          title: "Upload dismissed",
          description: "The failed upload has been removed from your inbox.",
        });
      },
      onError: (error) => {
        toast({
          title: "Dismiss failed",
          description:
            (error as Error)?.message || "Could not dismiss this upload.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className={CONNECTOR_KANBAN_CARD_SHELL}>
      <div className="mb-[11px] flex min-w-0 items-center gap-[11px]">
        <div
          className={cn(
            "flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px]",
            CONNECTOR_STAGE_COLORS.ai_analysis.avatarTint
          )}
        >
          <FileText className="h-4 w-4" />
        </div>
        <p
          className="min-w-0 flex-1 line-clamp-2 break-words text-[13.5px] font-extrabold leading-snug"
          title={uploadJob.fileName}
        >
          {uploadJob.fileName}
        </p>
      </div>

      <Badge className="mb-2 w-fit max-w-full self-start border-0 bg-secondary text-[10px] uppercase tracking-wider text-secondary-foreground hover:bg-secondary">
        Resume uploaded
      </Badge>

      <div className="mb-[11px] flex min-w-0 items-start gap-[7px] text-xs font-semibold text-[#4A5161]">
        <Clock className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 break-words leading-snug">
          Uploaded {formatDateTime(uploadJob.createdAt)}
        </span>
      </div>

      {(isQueued || isProcessing) && (
        <AiAnalysisStatusBanner
          message={
            isQueued
              ? "AI reviewing job fit. Refresh to see updates."
              : "Analyzing resume. Refresh to see updates."
          }
        />
      )}

      {isFailed && (
        <>
          <UploadFailureNotice
            className="mb-3"
            failureReason={uploadJob.failureReason}
            retryCount={uploadJob.retryCount}
          />
          <ConnectorCardActionRow>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismiss}
              disabled={dismissMutation.isPending}
              className={cn(CONNECTOR_CARD_BTN_REJECT, "flex-1")}
            >
              {dismissMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              Dismiss
            </Button>
            <Button
              size="sm"
              onClick={handleRetry}
              disabled={!canRetry || retryMutation.isPending}
              className={cn(CONNECTOR_CARD_BTN_PRIMARY, "flex-1")}
            >
              {retryMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Retry ({uploadJob.retryCount}/{MAX_AI_RETRY_ATTEMPTS})
            </Button>
          </ConnectorCardActionRow>
        </>
      )}
    </div>
  );
}

interface FailedPoolMatchActionsProps {
  linkedUploadJob: InboxLinkedUploadJob;
}

function FailedPoolMatchActions({
  linkedUploadJob,
}: FailedPoolMatchActionsProps) {
  const retryMutation = useRetryUploadJob();
  const dismissMutation = useDismissUploadJob();
  const { toast } = useToast();

  const canRetry = linkedUploadJob.retryCount < MAX_AI_RETRY_ATTEMPTS;

  const handleRetry = () => {
    retryMutation.mutate(linkedUploadJob.uploadJobId, {
      onSuccess: () => {
        toast({
          title: "Retry queued",
          description: "Resume will be reprocessed. Refresh to see updates.",
        });
      },
      onError: (error) => {
        toast({
          title: "Retry failed",
          description:
            (error as Error)?.message || "Could not retry this upload.",
          variant: "destructive",
        });
      },
    });
  };

  const handleDismiss = () => {
    dismissMutation.mutate(linkedUploadJob.uploadJobId, {
      onSuccess: () => {
        toast({
          title: "Upload dismissed",
          description: "The failed upload has been removed from your inbox.",
        });
      },
      onError: (error) => {
        toast({
          title: "Dismiss failed",
          description:
            (error as Error)?.message || "Could not dismiss this upload.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <ConnectorCardActionRow>
      <Button
        size="sm"
        variant="outline"
        onClick={handleDismiss}
        disabled={dismissMutation.isPending}
        className={cn(CONNECTOR_CARD_BTN_REJECT, "flex-1")}
      >
        {dismissMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        )}
        Dismiss
      </Button>
      <Button
        size="sm"
        onClick={handleRetry}
        disabled={!canRetry || retryMutation.isPending}
        className={cn(CONNECTOR_CARD_BTN_PRIMARY, "flex-1")}
      >
        {retryMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Retry ({linkedUploadJob.retryCount}/{MAX_AI_RETRY_ATTEMPTS})
      </Button>
    </ConnectorCardActionRow>
  );
}
