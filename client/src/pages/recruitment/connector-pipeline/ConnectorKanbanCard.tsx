import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMatchScoreBadgeClass } from "@/lib/recruitment/match-score-colors";
import {
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  Eye,
  Mail,
  ExternalLink,
  Send,
  Users,
  XCircle,
  Upload,
} from "lucide-react";
import { formatDateTime } from "@/utils/dateFormatter";
import { type ConnectorCandidate } from "./types";
import { getCancellationReasonLabel } from "@/lib/recruitment/cancellation-reasons";
import { ConnectorCandidateDetailModal } from "./ConnectorCandidateDetailModal";
import { hasUploadedResume } from "./connector-to-inbox-candidate";
import {
  canReplaceReferredResume,
  referredReplaceTarget,
} from "@/lib/recruitment/connector-replace-resume.utils";
import type { ReplaceResumeTarget } from "@/lib/recruitment/connector-replace-resume.utils";
import { CONNECTOR_EMAIL_LOG_STAGES } from "@/lib/api/recruitment-email-logs";
import { RecruitmentEmailLogsButton } from "@/components/recruitment/RecruitmentEmailLogsButton";
import { CONNECTOR_KANBAN_CARD_SHELL } from "./connector-card-buttons";
import { CandidateRelevanceRow } from "@/components/recruitment/CandidateRelevance";
import type { ResumeSearchMatch } from "@/lib/api/recruitment";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";

interface ConnectorKanbanCardProps {
  candidate: ConnectorCandidate;
  isHighlighted?: boolean;
  stageLabel?: string;
  onReplaceResume?: (target: ReplaceResumeTarget) => void;
  /** Present only while a resume search is filtering the board. */
  relevance?: ResumeSearchMatch;
  relevanceTopScore?: number;
}

export default function ConnectorKanbanCard({
  candidate,
  isHighlighted = false,
  stageLabel,
  onReplaceResume,
  relevance,
  relevanceTopScore,
}: ConnectorKanbanCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isPayoutCancelled = candidate.payoutStatus === "cancelled";
  const cancellationLabel = isPayoutCancelled
    ? getCancellationReasonLabel(candidate.payoutCancellationReason)
    : null;
  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  return (
    <div
      ref={cardRef}
      id={`connector-candidate-${candidate.id}`}
      className={cn(
        CONNECTOR_KANBAN_CARD_SHELL,
        isHighlighted &&
          "border-primary ring-2 ring-primary/30 shadow-md shadow-primary/10"
      )}
    >
      {relevance ? (
        <CandidateRelevanceRow
          match={relevance}
          topScore={relevanceTopScore ?? relevance.score}
        />
      ) : null}

      <div className="mb-[11px] flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="break-words text-[13.5px] font-extrabold leading-snug">
            {candidate.candidateName}
          </p>
        </div>
        {candidate.matchScore != null && candidate.matchScore > 0 ? (
          <Badge
            className={cn(
              "flex-shrink-0 border text-xs",
              getMatchScoreBadgeClass(candidate.matchScore)
            )}
          >
            {Math.round(candidate.matchScore)}%
          </Badge>
        ) : null}
      </div>

      {candidate.source === "direct_application" ? (
        <Badge className="mb-2 w-fit max-w-full self-start border-0 bg-blue-50 text-[10px] uppercase tracking-wider text-blue-600 hover:bg-blue-50">
          <ExternalLink className="mr-0.5 h-3 w-3" />
          Applied via Shared Link
        </Badge>
      ) : null}

      {candidate.stage === "not_qualified" ? (
        <div className="mb-2 flex items-start gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
          <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
          <span className="text-[11px] font-medium leading-snug text-slate-600">
            {candidate.notQualifiedReason ??
              "Did not meet the qualification criteria"}
          </span>
        </div>
      ) : null}

      {hasUploadedResume(candidate) ? (
        <Badge className="mb-2 w-fit max-w-full self-start border-0 bg-secondary text-[10px] uppercase tracking-wider text-secondary-foreground hover:bg-secondary">
          Resume uploaded
        </Badge>
      ) : null}

      <div className="mb-[11px] flex flex-col gap-[5px]">
        {candidate.currentTitle ? (
          <div className="flex items-start gap-[7px] text-xs font-semibold text-[#4A5161]">
            <Briefcase className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 break-words leading-snug">
              {candidate.currentTitle}
            </span>
          </div>
        ) : null}
        <div className="flex items-start gap-[7px] text-xs font-semibold text-[#4A5161]">
          <Briefcase className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 break-words leading-snug">
            {candidate.jobTitle}
          </span>
        </div>
        <div className="flex items-start gap-[7px] text-xs font-semibold text-[#4A5161]">
          <Building2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 break-words leading-snug">
            {candidate.jobCompany}
          </span>
        </div>
        {candidate.candidateEmail ? (
          <div className="flex items-start gap-[7px] text-xs font-semibold text-[#4A5161]">
            <Mail className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 break-all leading-snug">
              {candidate.candidateEmail}
            </span>
          </div>
        ) : null}
        {candidate.bountyAmount > 0 ? (
          <div className="flex items-center gap-[7px] text-xs font-semibold text-[#4A5161]">
            <DollarSign className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span>
              <span className="font-extrabold text-brand-amethyst">
                ${formatMoneyWithCommas(candidate.bountyAmount)}
              </span>{" "}
              payout
            </span>
          </div>
        ) : null}
        {candidate.stage === "interview_invite_sent" &&
        candidate.inviteSentAt ? (
          <div className="flex items-start gap-[7px] text-xs font-semibold text-[#4A5161]">
            <Send className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 break-words leading-snug">
              Invite sent {formatDateTime(candidate.inviteSentAt)}
            </span>
          </div>
        ) : null}
        {candidate.stage === "interview_scheduled" &&
        candidate.interviewScheduledAt ? (
          <div className="flex items-start gap-[7px] text-xs font-semibold text-[#4A5161]">
            <Calendar className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 break-words leading-snug">
              Interview scheduled{" "}
              {formatDateTime(candidate.interviewScheduledAt)}
            </span>
          </div>
        ) : null}
        {candidate.stage === "interview_completed" &&
        candidate.interviewCompletedAt ? (
          <div className="flex items-start gap-[7px] text-xs font-semibold text-[#4A5161]">
            <Calendar className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 break-words leading-snug">
              Interview completed{" "}
              {formatDateTime(candidate.interviewCompletedAt)}
            </span>
          </div>
        ) : null}
        {candidate.bountyAmount > 0 && candidate.isSplit ? (
          <div className="flex items-start gap-[7px] text-[11px] text-muted-foreground">
            <Users className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <span>
              This payout amount is shared 50/50 with another connector who also
              helped bring this candidate.
            </span>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "mb-[11px] grid gap-2",
          CONNECTOR_EMAIL_LOG_STAGES.has(candidate.stage)
            ? "grid-cols-2"
            : "grid-cols-1"
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 min-w-0 w-full gap-1.5 rounded-xl border-slate-200 text-[13px] font-semibold"
          onClick={() => setDetailOpen(true)}
        >
          <Eye className="h-4 w-4" />
          View
        </Button>
        {CONNECTOR_EMAIL_LOG_STAGES.has(candidate.stage) ? (
          <RecruitmentEmailLogsButton
            audience="connector"
            candidateId={candidate.id}
          />
        ) : null}
        <ConnectorCandidateDetailModal
          mode="referred"
          candidate={candidate}
          boardStage={candidate.stage}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          stageLabel={stageLabel}
        />
      </div>

      {canReplaceReferredResume(candidate) && onReplaceResume ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mb-[11px] h-9 w-full gap-1.5 rounded-xl border-slate-200 text-[13px] font-semibold"
          onClick={() => onReplaceResume(referredReplaceTarget(candidate))}
        >
          <Upload className="h-4 w-4" />
          Update resume
        </Button>
      ) : null}

      {isPayoutCancelled ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2">
          <div className="flex items-start gap-1.5">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold leading-tight text-red-700">
                Payout cancelled
              </p>
              {cancellationLabel ? (
                <p className="mt-0.5 break-words text-[11px] font-medium leading-snug text-red-700">
                  {cancellationLabel}
                </p>
              ) : null}
              {candidate.payoutCancellationNotes ? (
                <p className="mt-1 line-clamp-3 break-words text-[11px] leading-snug text-red-700/80">
                  {candidate.payoutCancellationNotes}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
