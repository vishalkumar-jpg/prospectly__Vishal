import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Eye,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Send,
  Briefcase,
  Building2,
  Clock,
  CheckCircle,
  Linkedin,
  BadgeCheck,
  Wallet,
  Pencil,
  Receipt,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { isHttpOrHttpsUrl } from "@/lib/url-utils";
import { getMatchScoreBadgeClass } from "@/lib/recruitment/match-score-colors";
import { RECRUITER_EMAIL_LOG_STAGES } from "@/lib/api/recruitment-email-logs";
import { RecruitmentEmailLogsButton } from "@/components/recruitment/RecruitmentEmailLogsButton";
import { type KanbanCandidate } from "./types";
import { CandidateRelevanceRow } from "@/components/recruitment/CandidateRelevance";
import type { ResumeSearchMatch } from "@/lib/api/recruitment";

interface KanbanCandidateCardProps {
  candidate: KanbanCandidate;
  onView: () => void;
  onShortlist?: () => void;
  onReject?: () => void;
  /** Rejected cards only — opens the "Move Back to Stage" dialog. */
  onReinstate?: () => void;
  onScheduleInterview?: () => void;
  onResendInvite?: () => void;
  onMarkOutcome?: () => void;
  onMoveToHired?: () => void;
  onReleaseConnectorPayout?: () => void;
  onReleaseCandidateBonus?: () => void;
  onEditClassification?: () => void;
  /** Present only while a resume search is active. */
  relevance?: ResumeSearchMatch;
  relevanceTopScore?: number;
  /** Deep-link target (e.g. from the dashboard's Payouts Due) — scroll to + ring. */
  isHighlighted?: boolean;
}

// .ca button system — mirrors final.html: 7px/10px padding, 9px radius, 12px/700 text.
const CA =
  "h-auto gap-1.5 rounded-[9px] px-2.5 py-[7px] text-xs font-bold transition-all";
const CA_NEUTRAL = cn(
  CA,
  "hover:border-brand-amethyst/30 hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
);
const CA_REJECT = cn(
  CA,
  "border-brand-destructive/30 bg-brand-destructive/10 text-brand-destructive hover:border-brand-destructive/50 hover:bg-brand-destructive/15 hover:text-brand-destructive"
);
const CA_RESEND = cn(
  CA,
  "border-brand-amethyst/30 bg-brand-amethyst/10 text-brand-amethyst hover:border-brand-amethyst/50 hover:bg-brand-amethyst/15 hover:text-brand-amethyst"
);
const CA_PRIMARY = cn(
  CA,
  "border-transparent bg-brand-gradient text-white shadow-brand-cta hover:-translate-y-px hover:text-white"
);
// Retry CTA for a failed payout — red/destructive, distinct from the primary
// (brand-gradient) release CTA so HR reads it as "something went wrong".
const CA_RETRY = cn(
  CA,
  "border-transparent bg-red-600 text-white hover:-translate-y-px hover:bg-red-600 hover:text-white"
);

export default function KanbanCandidateCard({
  candidate,
  onView,
  onShortlist,
  onReject,
  onReinstate,
  onScheduleInterview,
  onResendInvite,
  onMarkOutcome,
  onMoveToHired,
  onReleaseConnectorPayout,
  onReleaseCandidateBonus,
  onEditClassification,
  relevance,
  relevanceTopScore,
  isHighlighted = false,
}: KanbanCandidateCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      // inline: "center" also scrolls the horizontal board to this column.
      cardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }
  }, [isHighlighted]);

  // The server is the single source of truth for when identity is revealed
  // (interview stages, or early from `in_review` when the org has early
  // candidate-details access). A present `revealedName` means "show it".
  const isRevealed = !!candidate.revealedName;

  const showReject =
    !!onReject &&
    (candidate.stage === "in_review" ||
      candidate.stage === "shortlisted" ||
      candidate.stage === "interview_invite_sent" ||
      candidate.stage === "interview_completed" ||
      candidate.stage === "not_qualified");

  // Rejected cards get a single action: move the candidate back to a stage they
  // previously held. The eligible stages are resolved server-side inside the
  // dialog, so the card never has to reason about the pipeline. Purely a stage
  // move — no charge and no refund is involved.
  const showReinstate =
    candidate.stage === "rejected" &&
    candidate.canReinstate === true &&
    !!onReinstate;

  // Hired-stage payout CTAs. Connector payout and the candidate bonus are
  // released independently, and each button PERSISTS after release as a
  // read-only "… Payout Details" view (including the onboarding-pending state,
  // whose "Awaiting Stripe Connect setup" status is shown inside the modal):
  //   - Edit Classification: sits in the View row while a connector row pends.
  //   - Connector button: shown whenever a connector row exists. Reads
  //     "Release Connector Payout" while actionable, else "Connector Payout Details".
  //   - Candidate button: shown whenever a candidate row exists. Reads
  //     "Release Candidate Bonus" while actionable, else "Candidate Payout Details".
  const isHired = candidate.stage === "hired";
  const hasPendingConn = candidate.hasPendingConnectorPayouts === true;
  const hasPendingCand = candidate.hasPendingCandidatePayout === true;
  const hasConnectorPayout = candidate.hasConnectorPayout === true;
  const hasCandidatePayout = candidate.hasCandidatePayout === true;
  // Recoverable failure → retry affordance; manual_review → badge only.
  const hasFailedConn = candidate.hasFailedConnectorPayout === true;
  const hasFailedCand = candidate.hasFailedCandidatePayout === true;
  const hasManualReviewConn = candidate.hasManualReviewConnectorPayout === true;
  const hasManualReviewCand = candidate.hasManualReviewCandidatePayout === true;
  const showEdit = isHired && hasPendingConn && !!onEditClassification;
  const showConnectorButton =
    isHired && hasConnectorPayout && !!onReleaseConnectorPayout;
  const showCandidateButton =
    isHired && hasCandidatePayout && !!onReleaseCandidateBonus;

  const showEmailLogs = RECRUITER_EMAIL_LOG_STAGES.has(candidate.stage);
  const showSecondaryRow =
    showReject ||
    showEdit ||
    (candidate.stage === "interview_scheduled" && !!onScheduleInterview);

  return (
    <div
      ref={cardRef}
      id={`kanban-candidate-${candidate.id}`}
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-[15px] shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D2D6E0] hover:shadow-[0_4px_14px_rgba(11,16,32,0.06)]",
        isHighlighted &&
          "border-brand-rose ring-4 ring-brand-rose/15 hover:border-brand-rose"
      )}
    >
      {relevance ? (
        <CandidateRelevanceRow
          match={relevance}
          topScore={relevanceTopScore ?? relevance.score}
        />
      ) : null}
      {/* cand-top */}
      <div className="mb-[11px] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-extrabold leading-[1.2]">
            {isRevealed ? candidate.revealedName : candidate.anonymousId}
          </p>
          {isRevealed && (
            <p className="truncate text-[10px] font-medium leading-[1.2] text-muted-foreground">
              {candidate.anonymousId}
            </p>
          )}
        </div>
        {candidate.matchScore != null && (
          <Badge
            className={cn(
              "flex-shrink-0 border text-xs",
              getMatchScoreBadgeClass(candidate.matchScore)
            )}
          >
            {candidate.matchScore}%
          </Badge>
        )}
      </div>

      {/* cand-rows */}
      <div className="mb-3 flex flex-col gap-[5px]">
        {candidate.currentTitle && (
          <div className="flex items-center gap-[7px] truncate text-xs font-semibold text-[#4A5161]">
            <Briefcase className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className="truncate">{candidate.currentTitle}</span>
          </div>
        )}
        {candidate.currentCompany && (
          <div className="flex items-center gap-[7px] truncate text-xs font-semibold text-[#4A5161]">
            <Building2 className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className="truncate">{candidate.currentCompany}</span>
          </div>
        )}
        {candidate.experienceYears != null && (
          <div className="flex items-center gap-[7px] truncate text-xs font-semibold text-[#4A5161]">
            <Clock className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className="truncate">
              {candidate.experienceYears} Years of Experience
            </span>
          </div>
        )}
        {candidate.revealedLinkedIn &&
          (isHttpOrHttpsUrl(candidate.revealedLinkedIn) ? (
            <a
              href={candidate.revealedLinkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-[7px] truncate text-xs font-semibold text-blue-600 hover:underline"
            >
              <Linkedin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">LinkedIn</span>
            </a>
          ) : (
            <span className="flex items-center gap-[7px] truncate text-xs font-semibold text-muted-foreground">
              <Linkedin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">LinkedIn</span>
            </span>
          ))}
      </div>

      {candidate.stage === "not_qualified" && (
        <div className="mb-2 flex items-start gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
          <span className="text-[11px] font-medium leading-snug text-slate-600">
            {candidate.notQualifiedReason ??
              "Did not meet the qualification criteria"}
          </span>
        </div>
      )}

      {candidate.referralType && (
        <Badge variant="outline" className="mb-2 text-[10px]">
          {candidate.referralType === "direct" ? "Direct 70%" : "Public 50%"}
        </Badge>
      )}

      {candidate.expectedSalary && (
        <div className="mb-2 flex items-center justify-end text-xs text-slate-500">
          <span>${candidate.expectedSalary.toLocaleString("en-US")}</span>
        </div>
      )}

      {/* cand-actions */}
      <div className="flex flex-col gap-[7px]">
        <div
          className={cn(
            "grid gap-[7px]",
            showEmailLogs ? "grid-cols-2" : "grid-cols-1"
          )}
        >
          <Button
            variant="outline"
            size="sm"
            className={cn(CA_NEUTRAL, "min-w-0 w-full")}
            onClick={onView}
          >
            <Eye className="h-3.5 w-3.5" /> View
          </Button>
          {showEmailLogs ? (
            <RecruitmentEmailLogsButton
              audience="recruiter"
              candidateId={candidate.id}
              className="h-auto min-w-0 w-full rounded-[9px] px-2 py-[7px] text-xs font-bold"
            />
          ) : null}
        </div>

        {showSecondaryRow ? (
          <div className="flex gap-[7px]">
            {showReject && (
              <Button
                variant="outline"
                size="sm"
                className={cn(CA_REJECT, "min-w-0 flex-1")}
                onClick={onReject}
              >
                <ThumbsDown className="h-3.5 w-3.5" /> Reject
              </Button>
            )}
            {showEdit && (
              <Button
                variant="outline"
                size="sm"
                className={cn(CA_NEUTRAL, "min-w-0 flex-1")}
                onClick={onEditClassification}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
            {candidate.stage === "interview_scheduled" &&
              onScheduleInterview && (
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(CA_NEUTRAL, "min-w-0 flex-1")}
                  onClick={onScheduleInterview}
                >
                  <Calendar className="h-3.5 w-3.5" /> Reschedule
                </Button>
              )}
          </div>
        ) : null}

        {(candidate.stage === "in_review" ||
          candidate.stage === "not_qualified") &&
          onShortlist && (
            <Button
              size="sm"
              className={cn(CA_PRIMARY, "w-full")}
              onClick={onShortlist}
            >
              <ThumbsUp className="h-3.5 w-3.5" /> Shortlist
            </Button>
          )}
        {candidate.stage === "shortlisted" && onScheduleInterview && (
          <Button
            size="sm"
            className={cn(CA_PRIMARY, "w-full")}
            onClick={onScheduleInterview}
          >
            <Calendar className="h-3.5 w-3.5" /> Schedule
          </Button>
        )}
        {candidate.stage === "interview_invite_sent" && (
          <Button
            variant="outline"
            size="sm"
            className={cn(CA_RESEND, "w-full")}
            onClick={onResendInvite}
          >
            <Send className="h-3.5 w-3.5" /> Resend
          </Button>
        )}
        {candidate.stage === "interview_scheduled" && onMarkOutcome && (
          <Button
            size="sm"
            className={cn(CA_PRIMARY, "w-full")}
            onClick={onMarkOutcome}
          >
            <CheckCircle className="h-3.5 w-3.5" /> Mark Outcome
          </Button>
        )}
        {candidate.stage === "interview_completed" && onMoveToHired && (
          <Button
            size="sm"
            className={cn(CA_PRIMARY, "w-full")}
            onClick={onMoveToHired}
          >
            <BadgeCheck className="h-3.5 w-3.5" /> Move to Hired
          </Button>
        )}
        {showReinstate && (
          <Button
            size="sm"
            className={cn(CA_PRIMARY, "w-full")}
            onClick={onReinstate}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Move Back to Stage
          </Button>
        )}
        {/* Hired stage: Edit sits in the View row above; the connector and
            candidate buttons each get their own full-width row. Each persists
            after release as a read-only "… Payout Details" button (outline
            style) — including the onboarding-pending state, whose status is
            shown inside the modal. */}
        {showConnectorButton && (
          <>
            {hasFailedConn && (
              <Badge
                variant="outline"
                className="w-full justify-center gap-1 border-red-200 bg-red-50 py-1 text-[11px] font-semibold text-red-700"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Payout Failed
              </Badge>
            )}
            {!hasFailedConn && hasManualReviewConn && (
              <Badge
                variant="outline"
                className="w-full justify-center gap-1 border-amber-200 bg-amber-50 py-1 text-[11px] font-semibold text-amber-700"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Needs Manual Review
              </Badge>
            )}
            {hasPendingConn ? (
              <Button
                size="sm"
                className={cn(CA_PRIMARY, "w-full")}
                onClick={onReleaseConnectorPayout}
              >
                <Wallet className="h-3.5 w-3.5" /> Release Connector Payout
              </Button>
            ) : hasFailedConn ? (
              <Button
                size="sm"
                className={cn(CA_RETRY, "w-full")}
                onClick={onReleaseConnectorPayout}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Retry Payout
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className={cn(CA_NEUTRAL, "w-full")}
                onClick={onReleaseConnectorPayout}
              >
                <Receipt className="h-3.5 w-3.5" /> Connector Payout Details
              </Button>
            )}
          </>
        )}
        {showCandidateButton && (
          <>
            {hasFailedCand && (
              <Badge
                variant="outline"
                className="w-full justify-center gap-1 border-red-200 bg-red-50 py-1 text-[11px] font-semibold text-red-700"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Payout Failed
              </Badge>
            )}
            {!hasFailedCand && hasManualReviewCand && (
              <Badge
                variant="outline"
                className="w-full justify-center gap-1 border-amber-200 bg-amber-50 py-1 text-[11px] font-semibold text-amber-700"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Needs Manual Review
              </Badge>
            )}
            {hasPendingCand ? (
              <Button
                size="sm"
                className={cn(CA_PRIMARY, "w-full")}
                onClick={onReleaseCandidateBonus}
              >
                <Wallet className="h-3.5 w-3.5" /> Release Candidate Bonus
              </Button>
            ) : hasFailedCand ? (
              <Button
                size="sm"
                className={cn(CA_RETRY, "w-full")}
                onClick={onReleaseCandidateBonus}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Retry Payout
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className={cn(CA_NEUTRAL, "w-full")}
                onClick={onReleaseCandidateBonus}
              >
                <Receipt className="h-3.5 w-3.5" /> Candidate Payout Details
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
