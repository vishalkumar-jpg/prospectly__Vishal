import { Fragment } from "react";
import { ReferCandidatesEmptyState } from "./ReferCandidatesEmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Building2,
  MapPin,
  Banknote,
  Archive,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  AlertTriangle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  SearchX,
  Calendar,
  FileText,
  Briefcase,
} from "lucide-react";
import { formatDateTime } from "@/utils/dateFormatter";
import { htmlToPlainText } from "@/lib/rich-text";
import {
  formatSalaryPeriod,
  formatSalaryRange,
  isValidSalaryRange,
} from "@/utils/formatter";
import type { ClosedInboxJob, InboxCandidate, InboxItem } from "./types";
import { CandidateGapAnalysisSummary } from "@/components/recruitment/gap-analysis/CandidateGapAnalysisSummary";
import {
  resolveGapAnalysisForInbox,
  resolveInboxFallbackSignals,
} from "@/lib/recruitment/gap-analysis-resolve";

const STATUS_BADGE_CONFIG: Record<
  string,
  { label: string; icon: typeof CheckCircle; className: string }
> = {
  processing: {
    label: "AI Analysis",
    icon: Clock,
    // Match InboxTab processing badge (same feature palette).
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-slate-50 text-slate-600 border-slate-200",
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
};

const CONSENT_DECLINE_LABELS: Record<string, string> = {
  not_interested: "Not interested in this role",
  bad_timing: "Bad timing - not looking to move right now",
  salary: "Salary expectations don't match",
  location: "Location/work arrangement doesn't work",
  company: "Not interested in this company",
  dont_know_connector: "I don't know this connector",
  other: "Other reason",
};

function isInboxCandidate(item: InboxItem): item is InboxCandidate {
  return item.type !== "upload_job";
}

function getMatchScoreRingClass({ matchScore }: { matchScore: number }) {
  if (matchScore >= 90)
    return "bg-emerald-50 text-emerald-700 border-emerald-300";
  if (matchScore >= 80) return "bg-teal-50 text-teal-700 border-teal-300";
  return "bg-amber-50 text-amber-700 border-amber-300";
}

function formatConsentDeclineReason({ reason }: { reason: string }) {
  return CONSENT_DECLINE_LABELS[reason] ?? reason;
}

function renderClosedCandidateStatusBadge({
  candidate,
}: {
  candidate: InboxCandidate;
}) {
  const config = STATUS_BADGE_CONFIG[candidate.status];
  if (!config) return null;
  const Icon = config.icon;
  const declinedAt =
    candidate.status === "connector_declined"
      ? candidate.connectorDeclinedAt
      : candidate.status === "consent_declined"
        ? candidate.consentRespondedAt
        : null;
  return (
    <>
      <Badge
        variant="outline"
        className={cn("gap-1 text-xs", config.className)}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
      {declinedAt && (
        <span className="text-[10px] text-slate-400 mt-1 block">
          Declined on {formatDateTime(declinedAt)}
        </span>
      )}
    </>
  );
}

function renderClosedCandidateConsentDecline({
  candidate,
}: {
  candidate: InboxCandidate;
}) {
  if (candidate.status !== "consent_declined") return null;
  if (!candidate.consentDeclineReason && !candidate.consentDeclineNotes)
    return null;
  return (
    <div className="mt-2 rounded-md bg-red-50 border border-red-100 p-2.5 text-xs text-slate-600">
      {candidate.consentDeclineReason && (
        <p className="font-medium text-red-700">
          {formatConsentDeclineReason({
            reason: candidate.consentDeclineReason,
          })}
        </p>
      )}
      {candidate.consentDeclineNotes && (
        <p className="mt-1 flex items-start gap-1 text-slate-500">
          <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
          {candidate.consentDeclineNotes}
        </p>
      )}
    </div>
  );
}

function renderClosedCandidateCard({
  candidate,
  jobTitle,
  jobCompany,
}: {
  candidate: InboxCandidate;
  jobTitle: string;
  jobCompany: string;
}) {
  const matchScore = Math.round(candidate.matchScore);
  const gapData = resolveGapAnalysisForInbox(candidate);
  const fallbackSignals = resolveInboxFallbackSignals(candidate);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-slate-500">
            {candidate.candidateName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-800 text-sm leading-tight">
            {candidate.candidateName}
          </p>
          {candidate.candidateTitle && (
            <div className="flex items-center gap-1 text-xs text-slate-500 leading-tight mt-0.5">
              <Briefcase className="h-3 w-3 text-slate-400 flex-shrink-0" />
              <span>{candidate.candidateTitle}</span>
            </div>
          )}
          {candidate.candidateCompany && (
            <div className="flex items-center gap-1 text-xs text-slate-500 leading-tight mt-0.5">
              <Building2 className="h-3 w-3 text-slate-400 flex-shrink-0" />
              <span>{candidate.candidateCompany}</span>
            </div>
          )}
          {candidate.candidateEmail && (
            <p className="text-xs text-slate-400 leading-tight mt-0.5 flex items-center gap-1">
              <Mail className="h-3 w-3 flex-shrink-0" />
              {candidate.candidateEmail}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center flex-shrink-0">
          <div
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold border-2",
              getMatchScoreRingClass({ matchScore })
            )}
          >
            {matchScore}%
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">Match</span>
        </div>
      </div>
      <CandidateGapAnalysisSummary
        variant="embedded"
        data={gapData}
        fallbackSignals={fallbackSignals}
      />
      <div className="flex flex-col items-end">
        {renderClosedCandidateStatusBadge({ candidate })}
      </div>
      {renderClosedCandidateConsentDecline({ candidate })}
    </div>
  );
}

interface ClosedTabProps {
  jobs: ClosedInboxJob[];
  loading: boolean;
  error: Error | null;
  onViewJobDetails?: (job: ClosedInboxJob) => void;
  onRetry: () => void;
  pagination: {
    page: number;
    limit: number;
    totalJobs: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
  onPageChange: (page: number) => void;
  searchTerm?: string;
}

function renderClosedJobSkillBadges({ job }: { job: ClosedInboxJob }) {
  return (
    <>
      {job.jobRequiredSkills && job.jobRequiredSkills.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Required Skills
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {job.jobRequiredSkills.map((skill, i) => (
              <Badge
                key={`req-${i}`}
                variant="outline"
                className="text-xs bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-700 hover:text-teal-50 transition-colors cursor-default"
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {job.jobPreferredSkills && job.jobPreferredSkills.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Preferred Skills
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {job.jobPreferredSkills.map((skill, i) => (
              <Badge
                key={`pref-${i}`}
                variant="outline"
                className="text-xs bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-700 hover:text-teal-50 transition-colors cursor-default"
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function renderClosedJobLeftPanel({
  job,
  onViewJobDetails,
  hasSalary,
  salaryMin,
  salaryMax,
}: {
  job: ClosedInboxJob;
  onViewJobDetails?: (job: ClosedInboxJob) => void;
  hasSalary: boolean;
  salaryMin: number;
  salaryMax: number;
}) {
  return (
    <div className="p-5 md:w-2/5 lg:w-1/3 flex-shrink-0">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-lg font-bold text-slate-800">{job.jobTitle}</h3>
        <Badge
          variant="secondary"
          className="text-xs bg-slate-100 text-slate-500"
        >
          Closed
        </Badge>
      </div>

      <div className="space-y-1.5 text-sm text-slate-500 mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span>{job.jobCompany}</span>
        </div>
        {job.jobLocation && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span>{job.jobLocation}</span>
          </div>
        )}
      </div>

      {job.jobDescription && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Description
          </p>
          <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
            {htmlToPlainText(job.jobDescription)}
          </p>
        </div>
      )}

      {renderClosedJobSkillBadges({ job })}

      {hasSalary && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Salary Range
          </p>
          <div className="flex items-center gap-1.5 text-sm">
            <Banknote className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span className="font-medium text-slate-600">
              {formatSalaryRange(salaryMin, salaryMax, job.jobSalaryCurrency)}
            </span>
            {job.jobSalaryPeriod && (
              <span className="text-slate-400">
                /{formatSalaryPeriod(job.jobSalaryPeriod)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Posted Date */}
      {job.jobPostedAt && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Job Posted At
          </p>
          <div className="flex items-center gap-1.5 text-sm">
            <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-600">
              {formatDateTime(job.jobPostedAt)}
            </span>
          </div>
        </div>
      )}

      {/* Close reason */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Close Reason
        </p>
        <p className="text-sm text-slate-600 italic">
          {job.closedReason || "No reason provided"}
        </p>
      </div>

      <div
        className={cn(
          onViewJobDetails && "grid grid-cols-2 gap-2",
          !onViewJobDetails && "flex items-center"
        )}
      >
        <div
          className={cn(
            "bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-center",
            onViewJobDetails && "flex items-center justify-center min-w-0",
            !onViewJobDetails && "flex-1"
          )}
        >
          <span className="text-sm font-semibold text-slate-500 truncate block">
            {job.candidates.length} Matched Candidate
            {job.candidates.length !== 1 ? "s" : ""}
          </span>
        </div>
        {onViewJobDetails && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewJobDetails(job)}
            className="h-9 gap-1.5 w-full min-w-0"
          >
            <FileText className="h-4 w-4 shrink-0" />
            Job Details
          </Button>
        )}
      </div>
    </div>
  );
}

function renderClosedJobCandidatesPanel({ job }: { job: ClosedInboxJob }) {
  return (
    <div className="flex-1 border-t md:border-t-0 md:border-l border-slate-200 bg-slate-50/60 md:max-h-[65vh] md:overflow-hidden md:hover:overflow-y-auto">
      <div className="p-4 space-y-3">
        {job.candidates.filter(isInboxCandidate).map((candidate) => (
          <Fragment key={candidate.matchId}>
            {renderClosedCandidateCard({
              candidate,
              jobTitle: job.jobTitle,
              jobCompany: job.jobCompany,
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function ClosedSkeleton() {
  return (
    <div className="space-y-5 mx-auto">
      {[1, 2].map((i) => (
        <Card key={i} className="border-slate-200 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="p-5 md:w-2/5 lg:w-1/3 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
            <div className="flex-1 md:border-l border-t md:border-t-0 border-slate-200 p-4 space-y-3">
              {[1, 2].map((j) => (
                <div
                  key={j}
                  className="bg-white rounded-lg border border-slate-200 p-4 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function ClosedTab({
  jobs,
  loading,
  error,
  onViewJobDetails,
  onRetry,
  pagination,
  onPageChange,
  searchTerm,
}: ClosedTabProps) {
  const totalCandidates = jobs.reduce((sum, j) => sum + j.candidates.length, 0);

  if (loading) {
    return <ClosedSkeleton />;
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
          We couldn't load your closed jobs. Please try again.
        </p>
        <Button variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      </div>
    );
  }

  if (totalCandidates === 0) {
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
            No closed jobs match "{searchTerm}". Try a different search term.
          </p>
        </div>
      );
    }
    return (
      <ReferCandidatesEmptyState
        icon={Archive}
        title="No closed jobs yet"
        description="When jobs you've referred candidates to are closed, they'll appear here for reference. Browse the marketplace to find more roles to refer."
      />
    );
  }

  return (
    <div className="space-y-5 mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Archive className="h-5 w-5 text-slate-500" />
        <h2 className="text-lg font-semibold text-slate-700">Closed Jobs</h2>
      </div>

      {jobs.map((job) => {
        const salaryMin = parseFloat(job.jobSalaryRangeMin) || 0;
        const salaryMax = parseFloat(job.jobSalaryRangeMax) || 0;
        const hasSalary = isValidSalaryRange(salaryMin, salaryMax);
        return (
          <Card
            key={job.jobId}
            className="border-slate-200 overflow-hidden opacity-80"
          >
            <div className="flex flex-col md:flex-row">
              {renderClosedJobLeftPanel({
                job,
                onViewJobDetails,
                hasSalary,
                salaryMin,
                salaryMax,
              })}
              {renderClosedJobCandidatesPanel({ job })}
            </div>
          </Card>
        );
      })}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasPrevPage}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasNextPage}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {jobs.length > 0 && (!pagination || !pagination.hasNextPage) && (
        <p className="text-center text-sm italic text-muted-foreground py-6">
          You've reached the end
        </p>
      )}
    </div>
  );
}
